const myVersion = "0.6.79", myProductName = "feedland"; 

exports.start = start; //1/18/23 by DW

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");
const davetwitter = require ("davetwitter"); 
const daveappserver = require ("daveappserver");
const davesql = require ("davesql");
const opml = require ("opml");
const database = require ("feedlanddatabase"); 
const reallysimple = require ("reallysimple");
const blog = require ("./blog.js");
const process = require ("process"); //9/14/22 by DW
const qs = require ("querystring"); //10/9/22 by DW
const wordpress = require ("wpidentity"); //3/23/24 by DW


var config = {
	urlForFeeds: "http://data.feedland.org/feeds/", //11/5/22 by DW
	s3PathForFeeds: "/data.feedland.org/feeds/",
	
	flWriteRssFilesLocally: true, //9/27/23 by DW
	localRssPath: "data/feeds/",
	generatorForFeed: myProductName + " v" + myVersion,
	docsForFeed: "https://cyber.harvard.edu/rss/rss.html",
	maxFeedItems: 50,
	minSecsBetwFeedChecks: 10,
	flFeedChecksEnabled: true, //7/23/22 by DW
	flSocketServicesEnabled: true, //6/29/22 by DW
	getUserOpmlSubscriptions:  database.getUserOpmlSubscriptions, //6/27/22 by DW -- callbacks for feedlanddatabase
	getStats: daveappserver.getStats, //6/27/22 by DW
	notifySocketSubscribers, //6/27/22 by DW
	saveStats: daveappserver.saveStats, //6/27/22 by DW
	writeWholeFile: daveappserver.writeWholeFile, //6/27/22 by DW
	writeWholeFile: daveappserver.writeWholeFile, //6/27/22 by DW
	readWholeFile: daveappserver.readWholeFile, //7/3/22 by DW
	
	buildUsersFeed: blog.buidUsersFeed, //11/6/22 by DW
	
	rssCloud: { //10/9/22 by DW
		enabled: true,
		flRequestNotify: true,
		minSecsBetwRenews: 60, //how often we look for a feed that's ready to renew
		ctSecsBetwRenews: 23 * 60 * 60, //for an individual feed
		feedUpdatedCallback: "/feedupdated"
		},
	flRenewSubscriptions: true, //10/29/22 by DW
	urlFeedlandApp: "https://feedland.org/", //11/10/22 by DW
	
	flBackupOnStartup: false, //1/9/23 by DW
	flNightlyBackup: false, //3/29/23 by DW
	
	flNewsProducts: false, //1/20/23 by DW
	flUserFeeds: false, 
	flLikesFeeds: false, 
	
	urlStarterFeeds: "https://s3.amazonaws.com/scripting.com/publicfolder/feedland/subscriptionLists/starterfeeds.opml", //2/15/23 by DW
	
	urlNewsProductSource: "http://scripting.com/code/riverclient/index.html", //9/15/23 by DW
	flStaticFilesInSql: false, //9/20/23 by DW
	
	flUseSqlForSockets: false, //9/26/23 by DW
	minSecsBetwSqlSocketChecks: 5, //9/26/23 by DW
	
	logMinSecs: 5,  //9/26/23 by DW
	logMaxResults: 1000,  //9/26/23 by DW
	
	flUseReadingLists: true, //10/10/23 by DW
	minSecsBetwReadingListChecks: 60,  //10/10/23 by DW
	minSecsBetwIndividualReadingListCheck: 5 * 60, //10/10/23 by DW
	
	flWordPressIdentityDefault: false, //11/13/23 by DW
	flIncludeImageMetadata: false, //12/1/23 by DW
	flFeedsHaveIds: undefined, //1/31/24 by DW
	httpRequestTimeoutSecs: 1, //2/26/24 by DW
	flCanUseFeedIds: false, //2/26/24 by DW & 3/4/24 by DW
	
	urlImageForMetadata: "http://scripting.com/images/2022/10/20/someoneElsesFeedList.png",
	metaDescription: "The first full feed management system. Share lists of feeds with other users, both in and outside of FeedLand. Writing feeds, reading news.",
	
	membershipClosedHeadline: "We're not signing up new users yet.", //5/27/24 by DW
	membershipClosedExplanation: "We're building a new FeedLand capable of serving even more news and users."
	};

var whenLastDayRollover = new Date ();
var whenLastFeedCheck = new Date ();
var whenLastCloudRenew = new Date ();
var emailCache = new Object (); //12/14/22 by DW
var idLastNewItem = undefined; //9/26/23 by DW
var whenLastSqlSocketCheck = new Date (); //9/26/23 by DW
var whenLastReadingListCheck = new Date (); //10/10/23 by DW

function readJsonFile (url, callback) { //12/28/23 by DW
	request (url, function (err, response, jsontext) {
		if (err) {
			callback (err);
			}
		else {
			if ((response.statusCode >= 200) && (response.statusCode <= 299)) {
				var jstruct, flgood = true;
				try {
					jstruct = JSON.parse (jsontext);
					}
				catch (err) {
					callback (err);
					flgood = false;
					}
				if (flgood) {
					callback (undefined, jstruct);
					}
				}
			else {
				const message = "HTTP error == " + response.statusCode;
				callback ({message});
				}
			}
		});
	}
function getFeedList (callback) { //11/6/23 by DW
	const sqltext = "select feedUrl from feeds;";
	davesql.runSqltext (sqltext, function (err, result) {
		if (err) {
			callback (err);
			}
		else {
			var theList = new Array ();
			result.forEach (function (item) {
				theList.push (utils.trimWhitespace (item.feedUrl));
				});
			callback (undefined, theList);
			}
		});
	}

function viewMemoryUsage () { //9/14/22 by DW
	var jstruct = process.memoryUsage ();
	var usage = {
		rss: utils.gigabyteString (jstruct.rss),
		heapTotal: utils.gigabyteString (jstruct.heapTotal),
		heapUsed: utils.gigabyteString (jstruct.heapUsed),
		external: utils.gigabyteString (jstruct.external)
		};
	return (usage);
	}
function notifySocketSubscribers (verb, payload, flPayloadIsString, callbackToQualify) { //6/29/22 by DW
	if (config.flSocketServicesEnabled) {
		daveappserver.notifySocketSubscribers (verb, payload, flPayloadIsString, callbackToQualify);
		}
	}

function initLastNewItem (callback) { //9/26/23 by DW
	const sqltext = "select id from items order by id desc limit 1;";
	davesql.runSqltext (sqltext, function (err, result) {
		if (err) {
			console.log ("initLastNewItem: " + err.message); 
			if (callback !== undefined) {
				callback ();
				}
			}
		else {
			if (result.length == 0) {
				console.log ("initLastNewItem: error setting idLastNewItem."); 
				if (callback !== undefined) {
					callback ();
					}
				}
			else {
				idLastNewItem = result [0].id;
				console.log ("initLastNewItem: idLastNewItem == " + idLastNewItem);
				if (callback !== undefined) {
					callback ();
					}
				}
			}
		});
	}
function notifySocketSubscribersFromSql (callback) { //9/26/23 by DW
	const sqltext = "select * from items where id > " + davesql.encode (idLastNewItem) + " order by id desc;", whenstart = new Date ();
	davesql.runSqltext (sqltext, function (err, result) {
		if (err) {
			console.log ("notifySocketSubscribersFromSql: " + err.message); 
			}
		else {
			if (result.length > 0) {
				let feedRecs = new Object (); //if more than one item for a feed, we only have to get the feed data once
				
				var ids = ""; //5/21/25 by DW
				result.forEach (function (item) {
					if (ids.length > 0) {
						ids += ", ";
						}
					ids += item.id
					});
				console.log ("\nnotifySocketSubscribersFromSql: id's seen == " + ids + "\n"); 
				
				function doNext (ix) {
					if (ix < result.length) {
						const item = result [ix];
						function sendmessage (feedRec) {
							let jstruct = {
								item: database.convertDatabaseItem (item),
								theFeed: feedRec
								}
							if (config.flWebsocketEnabled) { //10/4/23 by DW
								database.updateSocketSubscribers ("newItem", jstruct);
								}
							if (callback !== undefined) { //10/1/23 by DW
								callback (jstruct);
								}
							}
						if (feedRecs [item.feedUrl] === undefined) {
							database.getFeed (item.feedUrl, function (err, feedRec) {
								if (err) {
									console.log ("notifySocketSubscribersFromSql: err.message == " + err.message);
									}
								else {
									feedRecs [item.feedUrl] = feedRec;
									sendmessage (feedRec);
									}
								doNext (ix + 1);
								});
							}
						else {
							sendmessage (feedRecs [item.feedUrl]);
							doNext (ix + 1);
							}
						}
					else {
						console.log ("notifySocketSubscribersFromSql: " + utils.secondsSince (whenstart) + " secs.");
						}
					}
				doNext (0);
				
				
				idLastNewItem = result [0].id;
				console.log ("notifySocketSubscribersFromSql: idLastNewItem == " + idLastNewItem);
				}
			}
		});
	}

function unsubList (screenname, urlArray, callback) { //6/28/22 by DW -- move into database code
	var returnArray = new Array ();
	function unsubnext (ix) {
		if (ix >= urlArray.length) {
			callback (undefined, returnArray);
			}
		else {
			database.deleteSubscription (screenname, urlArray [ix], function (err, data) {
				if (err) {
					returnArray.push (err);
					}
				else {
					returnArray.push (data);
					}
				unsubnext (ix + 1);
				});
			}
		}
	unsubnext (0);
	}
function notComment (item) { //return true if the outline element is not a comment
	return (!utils.getBoolean (item.isComment));
	}
function subscribeToOpml (screenname, opmltext, flDeleteEnabled, callback) { //6/30/22 by DW
	var sublist = new Array ();
	console.log ("subscribeToOpml: screenname == " + screenname + ", opmltext.length == " + opmltext.length);
	opml.parse (opmltext, function (err, theOutline) {
		if (err) {
			if (callback !== undefined) {
				callback (err);
				}
			}
		else {
			opml.expandIncludes (theOutline, function (theNewOutline) {
				opml.visitAll (theNewOutline, function (theNode) {
					if (notComment (theNode)) {
						if (theNode.type == "rss") {
							if (theNode.xmlUrl !== undefined) {
								console.log (theNode.xmlUrl);
								sublist.push (theNode);
								}
							}
						}
					return (true);
					});
				console.log ("subscribeToOpml: sublist == " + utils.jsonStringify (sublist));
				database.processSubscriptionList (screenname, sublist, flDeleteEnabled);
				if (callback !== undefined) {
					callback (undefined, sublist);
					}
				});
			}
		});
	}
function publishFileCallback (f, screenname, relpath, type, flprivate, filetext, url) {
	}

function addMacroToPagetable (pagetable) {
	function getConfigJson () {
		var theConfig = new Object ();
		function addvalue (name) {
			if (config [name] !== undefined) {
				theConfig [name] = config [name];
				}
			}
		addvalue ("flWebsocketEnabled");
		addvalue ("websocketPort");
		addvalue ("myDomain");
		addvalue ("mailSender");
		addvalue ("confirmEmailSubject");
		addvalue ("confirmationExpiresAfter");
		addvalue ("flUseTwitterIdentity");
		addvalue ("flEnableNewUsers");
		addvalue ("flBackupOnStartup");
		addvalue ("flNewsProducts");
		addvalue ("flUserFeeds");
		addvalue ("flLikesFeeds");
		addvalue ("urlForFeeds");
		addvalue ("s3PathForFeeds");
		addvalue ("s3LikesPath");
		addvalue ("urlNewsProducts");
		addvalue ("maxRiverItems");
		addvalue ("maxNewFeedSubscriptions");
		addvalue ("flUpdateFeedsInBackground");
		addvalue ("minSecsBetwFeedChecks");
		addvalue ("productName");
		addvalue ("productNameForDisplay");
		addvalue ("urlServerHomePageSource");
		addvalue ("urlStarterFeeds"); //1/22/23 by DW
		addvalue ("membershipClosedHeadline"); //5/27/24 by DW
		addvalue ("membershipClosedExplanation");
		return (utils.jsonStringify (theConfig));
		}
	pagetable.urlForFeeds = config.urlForFeeds;
	pagetable.flEnableNewUsers = config.flEnableNewUsers; //12/12/22 by DW
	pagetable.flUseTwitterIdentity = config.flUseTwitterIdentity; //1/10/23 by DW
	pagetable.urlNewsProducts = config.urlNewsProducts; //1/16/23 by DW
	pagetable.flNewsProducts = config.flNewsProducts;  //1/20/23 by DW
	pagetable.flUserFeeds = config.flUserFeeds;  //1/20/23 by DW
	pagetable.flLikesFeeds = config.flLikesFeeds;  //1/20/23 by DW
	pagetable.configJson = getConfigJson (); //1/21/23 by DW
	pagetable.feedlandVersion = myVersion; //9/21/23 by DW
	pagetable.flWordPressIdentityDefault = config.flWordPressIdentityDefault; //11/13/23 by DW
	pagetable.mysqlVersion = config.mysqlVersion; //11/18/23 by DW
	pagetable.membershipClosedHeadline = config.membershipClosedHeadline; //5/27/24 by DW
	pagetable.membershipClosedExplanation = config.membershipClosedExplanation;
	database.addMacroToPagetable (pagetable); //12/1/23 by DW
	
	//12/2/22 by DW & 12/1/23 by DW -- set up the normal case for the Facebook/Twitter metadata
		pagetable.metaUrl = config.urlServerForClient;
		
		const siteName = (config.productNameForDisplay === undefined) ? "FeedLand" : config.productNameForDisplay;
		
		pagetable.metaTitle = siteName;
		
		pagetable.metaDescription = config.metaDescription;
		
		
		pagetable.metaTwitterOwnerName = "";
		
		pagetable.metaSiteName = siteName;
		
		if (config.flIncludeImageMetadata) { //12/1/23 by DW
			const imgUrl = config.urlImageForMetadata;
			pagetable.facebookImage = "<meta property=\"og:image\" content=\"" + imgUrl + "\" />";
			pagetable.twitterImage = "<meta name=\"twitter:image:src\" content=\"" + imgUrl + "\">";
			}
		else {
			pagetable.facebookImage = "";
			pagetable.twitterImage = "";
			}
	
	}
function asyncAddMacroToPagetable (pagetable, theRequest, callback) { //12/2/22 by DW
	const maxDescChars = 300;
	const params = theRequest.params;
	function encode (s) {
		if (s == null) {
			return ("");
			}
		else {
			return (utils.encodeXml (s));
			}
		}
	
	if (params === undefined) {
		callback ();
		}
	else {
		if (params.item === undefined) {
			callback ();
			}
		else {
			const sqltext = "select * from items where id = " + davesql.encode (params.item) + ";";
			davesql.runSqltext (sqltext, function (err, result) {
				if (err) {
					callback (err);
					}
				else {
					if (result.length == 0) {
						callback ();
						}
					else {
						let itemRec = result [0];
						console.log ("asyncAddMacroToPagetable: itemRec.title == " + itemRec.title);
						pagetable.metaTitle = encode (itemRec.title);
						
						let desc = utils.stripMarkup (itemRec.description);
						desc = utils.maxStringLength (desc, maxDescChars, true, true);
						pagetable.metaDescription = encode (desc);
						
						if (itemRec.link !== undefined) {
							pagetable.metaUrl = encode (itemRec.link);
							}
						
						pagetable.metaImageUrl = "http://scripting.com/images/2022/12/03/transparentSpace.png";
						
						pagetable.facebookImage = "";
						pagetable.twitterImage = "";
						
						callback ();
						}
					}
				});
			}
		}
	}

function initNewsproductPagetable (pagetable) {
	pagetable.productname = config.productName;
	
	pagetable.productnameForDisplay = (config.productnameForDisplay === undefined) ? config.productName : config.productnameForDisplay; //1/9/24 by DW
	
	pagetable.version = myVersion;
	pagetable.urlServerForClient = config.urlServerForClient; 
	pagetable.flEnableLogin = false; 
	pagetable.urlWebsocketServerForClient = undefined;
	}
function renderUserNewsproduct (screenname, callback) { //9/15/23 by DW
	function checkUndefined (val) {
		if (val === undefined) {
			return ("");
			}
		else {
			return (val);
			}
		}
	database.getUserPrefs (screenname, function (err, thePrefs) {
		if (err) {
			callback (err);
			}
		else {
			if (thePrefs.emailSecret !== undefined) { //1/17/23 by DW 
				delete thePrefs.emailSecret;
				}
			const newsProductInfo = {
				screenname,
				categories: thePrefs.newsproductCategoryList,
				title: thePrefs.newsproductTitle,
				description: thePrefs.newsproductDescription,
				image: thePrefs.newsproductImage,
				style: thePrefs.newsproductStyle,
				script: thePrefs.newsproductScript
				}
			var pagetable = {
				screenname, 
				
				userPrefs: utils.jsonStringify (thePrefs),
				
				pageTitle: checkUndefined (newsProductInfo.title),
				pageDescription: checkUndefined (newsProductInfo.description),
				pageImage: checkUndefined (newsProductInfo.image),
				
				prefsPath: undefined,
				docsPath: undefined,
				theOutlineInJson: undefined
				}
			
			initNewsproductPagetable (pagetable);
			request (config.urlNewsProductSource, function (err, response, templatetext) {
				if (err) {
					callback (err);
					}
				else {
					if ((response.statusCode >= 200) && (response.statusCode <= 299)) {
						const pagetext = utils.multipleReplaceAll (templatetext.toString (), pagetable, false, "[%", "%]");
						callback (undefined, pagetext);
						}
					else {
						const message = "HTTP error == " + response.statusCode;
						callback ({message});
						}
					}
				});
			}
		});
	return (true);
	}
function renderUserNewsproductWithTemplate (urlOutlineTemplate, urlNewsProductApp, newsProductSpec, theRequest, callback) { //9/16/23 by DW
	const urlServerHomePageSource = (urlNewsProductApp === undefined) ? config.urlNewsProductSource : urlNewsProductApp; //12/24/23 by DW
	var pagetable = {
		urlTemplate: urlOutlineTemplate,
		newsProductInfo: "undefined",
		userPrefs: "undefined",
		urlServerForClient: config.urlServerForClient,
		urlServerHomePageSource //12/24/23 by DW
		};
	initNewsproductPagetable (pagetable);
	function getOutlineTemplate (callback) {
		if (newsProductSpec === undefined) {
			opml.readOutline (urlOutlineTemplate, function (err, theOutline) {
				if (err) {
					callback (err);
					}
				else {
					function getHeadAtt (name) {
						var attval = "";
						try {
							if (theOutline.opml.head [name] !== undefined) {
								attval = theOutline.opml.head [name];
								}
							}
						catch (err) {
							}
						return (attval);
						}
					pagetable.pageTitle = getHeadAtt ("title");
					pagetable.productnameForDisplay = pagetable.pageTitle; //1/9/24 by DW
					pagetable.pageDescription = getHeadAtt ("description");
					
					var imageUrl = getHeadAtt ("image");
					if (imageUrl.length != 0) {
						pagetable.pageImage = "<img src=\"" + imageUrl + "\">";
						}
					else {
						pagetable.pageImage = "";
						}
					
					if (false) { //(config.flExpandIncludes) { //8/22/22 by DW
						opml.expandIncludes (theOutline, function (theNewOutline) { //8/11/22 by DW
							pagetable.theOutlineInJson = utils.jsonStringify (theNewOutline);
							callback ();
							});
						}
					else {
						pagetable.theOutlineInJson = utils.jsonStringify (theOutline);
						pagetable.theNewsProductSpec = utils.jsonStringify (new Object ()); //12/28/23 by DW
						callback (undefined, theOutline);
						}
					}
				});
			}
		else { //12/28/23 by DW
			var theSpec;
			function isParamJson (theText) {
				try {
					theText = decodeURIComponent (theText);
					theSpec = JSON.parse (theText);
					return (true);
					}
				catch (err) {
					return (false);
					}
				}
			function getStuffForPagetable (theSpec) {
				function getValue (name) {
					try {
						if (theSpec [name] === undefined) {
							return ("");
							}
						else {
							return (theSpec [name]);
							}
						}
					catch (err) {
						return ("");
						}
					}
				pagetable.pageTitle = getValue ("title");
				pagetable.productnameForDisplay = pagetable.pageTitle; //1/9/24 by DW
				pagetable.pageDescription = getValue ("description");
				
				var imageUrl = getValue ("image");
				if (imageUrl.length != 0) {
					pagetable.pageImage = "<img src=\"" + imageUrl + "\">";
					}
				else {
					pagetable.pageImage = "";
					}
				
				pagetable.theNewsProductSpec = utils.jsonStringify (theSpec);
				pagetable.theOutlineInJson = utils.jsonStringify (new Object ());
				}
			
			if (isParamJson (newsProductSpec)) { //1/24/24 by DW
				getStuffForPagetable (theSpec); 
				callback (undefined, theSpec);
				}
			else {
				readJsonFile (newsProductSpec, function (err, theSpec) { //1/24/24 by DW -- assume it's a URL
					if (err) {
						callback (err);
						}
					else {
						getStuffForPagetable (theSpec); //1/24/24 by DW
						callback (undefined, theSpec);
						}
					});
				}
			}
		}
	function getHtmlTemplate (callback) {
		request (pagetable.urlServerHomePageSource, function (err, response, templatetext) {
			if (err) {
				callback (err);
				}
			else {
				if ((response.statusCode >= 200) && (response.statusCode <= 299)) {
					callback (undefined, templatetext);
					}
				else {
					const message = "HTTP error == " + response.statusCode;
					callback ({message});
					}
				}
			});
		}
	getOutlineTemplate (function (err, theOutline) {
		if (err) {
			callback (err);
			}
		else {
			getHtmlTemplate (function (err, htmltemplate) {
				if (err) {
					callback (err);
					}
				else {
					const pagetext = utils.multipleReplaceAll (htmltemplate.toString (), pagetable, false, "[%", "%]");
					callback (undefined, pagetext);
					}
				});
			}
		});
	}

function getStaticFileInSql (screenname, relpath, flprivate, callback) { //9/20/23 by DW
	const sqltext = "select * from staticfiles where screenname = " + davesql.encode (screenname) + " and relpath = " + davesql.encode (relpath) + " and flprivate = " + davesql.encode (flprivate) + ";";
	console.log ("getStaticFileInSql: screenname == " + screenname + ", relpath == " + relpath); //9/21/23 by DW
	davesql.runSqltext (sqltext, function (err, result) {
		if (err) {
			callback (err);
			}
		else {
			if (result.length == 0) {
				const message = "Can't find the file " + relpath + " for the user " + screenname + ".";
				callback ({message});
				}
			else {
				const theFileRec = result [0];
				const theReturnedData = {
					filedata: theFileRec.filecontents.toString (),
					filestats: {
						relpath: theFileRec.relpath,
						type: theFileRec.type,
						screenname: theFileRec.screenname,
						flprivate: theFileRec.flprivate,
						ctSaves: theFileRec.ctSaves,
						whenCreated: theFileRec.whenCreated,
						whenUpdated: theFileRec.whenUpdated
						}
					};
				callback (undefined, theReturnedData);
				}
			}
		});
	}
function publishStaticFileInSql (screenname, relpath, type, flprivate, filecontents, callback) { //9/20/23 by DW
	const now = new Date ();
	const fileRec = {
		screenname, 
		relpath, 
		type,
		flprivate,
		filecontents,
		whenCreated: now,
		whenUpdated: now,
		ctSaves: 1
		};
	console.log ("publishStaticFileInSql: screenname == " + screenname + ", relpath == " + relpath); //9/21/23 by DW
	getStaticFileInSql (screenname, relpath, flprivate, function (err, theOriginalFile) {
		if (!err) {
			fileRec.whenCreated = theOriginalFile.filestats.whenCreated;
			fileRec.ctSaves = theOriginalFile.filestats.ctSaves + 1;
			}
		const sqltext = "replace into staticfiles " + davesql.encodeValues (fileRec) + ";";
		davesql.runSqltext (sqltext, function (err, result) {
			if (err) {
				callback (err);
				}
			else {
				callback (undefined, fileRec);
				}
			});
		});
	}

function addEmailToUserInDatabase (screenname, emailAddress, magicString, flNewUser, callback) { //12/7/22 by DW
	database.findUserWithScreenname (screenname, function (flInDatabase, userRec) {
		if (flNewUser) { //1/7/23 by DW
			if (flInDatabase) {
				const message = "Can't create the user \"" + screenname + "\" because there already is a user with that name."
				callback ({message});
				}
			else {
				isEmailInDatabase (emailAddress, function (data) {
					if (data.flInDatabase) {
						const message = "Can't create the user \"" + emailAddress + "\" because there already is a user with that address."
						callback ({message});
						}
					else {
						if (config.flEnableNewUsers) {
							const now = new Date ();
							const newUserRec = {
								screenname, 
								emailAddress, 
								emailSecret: utils.getRandomPassword (10),
								whenCreated: now,
								whenUpdated: now,
								ctStartups: 1,
								whenLastStartup: now
								};
							const sqltext = "insert into users " + davesql.encodeValues (newUserRec);
							davesql.runSqltext (sqltext, function (err, result) {
								if (err) {
									callback (err);
									}
								else {
									callback (undefined, newUserRec.emailSecret);
									}
								});
							}
						else {
							const message = "Can't create the user \"" + screenname + "\" because new users are not being accepted here at this time.";
							callback ({message});
							}
						}
					});
				}
			}
		else {
			var emailSecret = undefined;
			if (flInDatabase) {
				if (userRec.emailSecret != null) {
					emailSecret = userRec.emailSecret; 
					}
				}
			if (emailSecret === undefined) {
				emailSecret = utils.getRandomPassword (10);
				function encode (s) {
					return (davesql.encode (s));
					}
				const sqltext = "update users set emailAddress = " + encode (emailAddress) + ",  emailSecret = " + encode (emailSecret) + " where screenname = " + encode (screenname) + ";";
				davesql.runSqltext (sqltext, function (err, result) {
					if (callback !== undefined) {
						if (err) {
							callback (err);
							}
						else {
							callback (undefined, emailSecret);
							}
						}
					});
				}
			else {
				callback (undefined, emailSecret);
				}
			}
		});
	}
function regenerateEmailSecret (screenname, callback) {
	const emailSecret = utils.getRandomPassword (10);
	const sqltext = "update users set emailSecret = " + davesql.encode (emailSecret) + " where screenname = " + davesql.encode (screenname) + ";";
	davesql.runSqltext (sqltext, function (err, result) {
		if (callback !== undefined) {
			if (err) {
				callback (err);
				}
			else {
				callback (undefined, {emailSecret});
				}
			}
		});
	}

function loginWordpressUser (accessToken, theUserInfo, callback) { //10/31/23 by DW
	function setWordpressAppData (userRec, callback) {
		var apps;
		if ((userRec.apps === undefined) || (userRec.apps == null)) { //11/4/23 by DW
			apps = new Object ();
			}
		else {
			apps = JSON.parse (userRec.apps);
			}
		var wordpress = (apps.wordpress === undefined) ? new Object () : apps.wordpress;
		wordpress.accessToken = accessToken;
		wordpress.userInfo = theUserInfo;
		apps.wordpress = wordpress;
		userRec.apps = apps;
		const sqltext = "replace into users " + davesql.encodeValues (userRec);
		davesql.runSqltext (sqltext, function (err, result) {
			if (err) {
				callback (err);
				}
			else {
				callback (undefined, userRec);
				}
			});
		}
	database.findUserWithEmail (theUserInfo.email, function (flEmailUsed, userRec) { 
		if (flEmailUsed) {
			setWordpressAppData (userRec, callback); //return the userRec
			}
		else {
			if (config.flEnableNewUsers) {
				const screenname = theUserInfo.username;
				database.findUserWithScreenname (screenname, function (flInDatabase, userRec) {
					if (flInDatabase) {
						const message = "Can't create the user \"" + screenname + "\" because there already is a user with that name.";
						callback ({message});
						}
					else {
						const now = new Date ();
						const newUserRec = {
							screenname, 
							emailAddress: theUserInfo.email, 
							emailSecret: utils.getRandomPassword (10),
							whenCreated: now,
							whenUpdated: now,
							ctStartups: 1,
							whenLastStartup: now,
							apps: {
								wordpress: {
									accessToken
									}
								}
							};
						const sqltext = "insert into users " + davesql.encodeValues (newUserRec);
						davesql.runSqltext (sqltext, function (err, result) {
							if (err) {
								callback (err);
								}
							else {
								callback (undefined, newUserRec);
								}
							});
						}
					});
				}
			else {
				const message = "Can't create the user \"" + screenname + "\" because new users are not being accepted here at this time.";
				callback ({message});
				}
			}
		});
	}

function getUserInfoWithWordpressToken (token, callback) { //3/23/24 by DW
	wordpress.getUserInfo (token, function (err, theUserInfo) { //gets us the email address, among other things
		database.findUserWithEmail (theUserInfo.email, function (flEmailUsed, userRec) { 
			if (flEmailUsed) {
				callback (undefined, userRec);
				}
			else {
				const message = "Can't find a user with email address \"" + theUserInfo.email + "\"";
				callback ({message});
				}
			});
		});
	}

function removeNullValuesFromObject (obj) { //9/26/22 by DW
	for (var x in obj) { 
		if (obj [x] == null) {
			obj [x] = undefined;
			}
		}
	return (obj);
	}
function getUserRecFromEmail (emailAddress, emailSecret, callback) { //12/13/22 by DW
	const sqltext = "select * from users where emailAddress = " + davesql.encode (emailAddress) + " and emailSecret = " + davesql.encode (emailSecret) + ";";
	davesql.runSqltext (sqltext, function (err, result) {
		if (err) {
			callback (err);
			}
		else {
			if (result.length == 0) {
				callback ({"message": "There is no user with that email address, or the access code is incorrect."});
				}
			else {
				callback (undefined, removeNullValuesFromObject (result [0]));
				}
			}
		});
	}
function isUserAdmin (emailaddress, callback) { //11/3/23 by DW
	database.findUserWithEmail (emailaddress, function (flUserExists, userRec) { 
		if (flUserExists) {
			callback (userRec.role == "admin", userRec);
			}
		else {
			callback (false);
			}
		});
	}

function getScreenNameFromEmail (emailAddress, callback) { //1/10/23 by DW
	const sqltext = "select * from users where emailAddress = " + davesql.encode (emailAddress) + ";";
	davesql.runSqltext (sqltext, function (err, result) {
		if (err) {
			callback (err);
			}
		else {
			if (result.length == 0) {
				callback ({"message": "There is no user with that email address."});
				}
			else {
				callback (undefined, result [0].screenname);
				}
			}
		});
	}
function isEmailInDatabase (emailAddress, callback) { //1/12/23 by DW
	if (emailAddress === undefined) {
		callback ({flInDatabase: false}); 
		}
	else {
		getScreenNameFromEmail (emailAddress, function (err, screenname) {
			callback ({flInDatabase: err === undefined}); //if there's no error it's in the database
			});
		}
	}
function getScreenname (params, callback) { //12/23/22 by DW
	function badloginCallback () {
		callback ({message: "Can't do the thing you want because the accessToken is not valid."});    
		}
	if (config.flUseTwitterIdentity) {
		davetwitter.getScreenName (params.oauth_token, params.oauth_token_secret, function (screenname) {
			if (screenname === undefined) {
				badloginCallback ();
				}
			else {
				callback (undefined, screenname);
				}
			});
		}
	else {
		if ((params.emailaddress !== undefined) && (params.emailcode !== undefined)) {
			getUserRecFromEmail (params.emailaddress, params.emailcode, function (err, userRec) {
				if (err) {
					badloginCallback ();
					}
				else {
					if (config.flEnableSupervisorMode) { //11/11/23 by DW
						if (params.actingas === undefined) { //11/4/23 by DW
							callback (undefined, userRec.screenname); 
							}
						else {
							if (userRec.role == "admin") {
								database.findUserWithScreenname (params.actingas, function (flInDatabase) {
									if (flInDatabase) {
										console.log ("\nfeedland: params.actingas == " + params.actingas + "\n");
										callback (undefined, params.actingas); 
										}
									else {
										callback (undefined, userRec.screenname); 
										}
									});
								}
							else {
								callback (undefined, userRec.screenname); 
								}
							}
						}
					else {
						callback (undefined, userRec.screenname); 
						}
					}
				});
			}
		else {
			badloginCallback ();
			}
		}
	}
function getRssCloudOptions () {
	let options = new Object ();
	for (var x in config.rssCloud) {
		options [x] = config.rssCloud [x];
		}
	
	let appconfig = daveappserver.getConfig ();
	
	const rssDomain = (appconfig.rssCloudNotifyDomain === undefined) ? appconfig.myDomain : appconfig.rssCloudNotifyDomain; //11/22/23 by DW
	var splits = rssDomain.split (":"); 
	options.domain = splits [0];
	options.port = (splits.length == 2) ? Number (splits [1]) : 80;
	
	if (options.port == NaN) {
		options.port = 80;
		}
	
	options.websocketPort = (appconfig.flWebsocketEnabled) ? appconfig.websocketPort : undefined;
	return (options);
	}
function handleRssCloudPing (feedUrl, callback) { //8/18/23 by DW
	console.log ("\nhandleRssCloudPing: feedUrl == " + feedUrl + "\n");
	database.checkOneFeed (feedUrl, function (err, data) {
		if (err) { //11/20/23 by DW
			console.log ("\nhandleRssCloudPing: err.message == " + err.message + "\n");
			}
		callback ("Thanks for the update! ;-)");
		});
	}
function getServerConfig (screenname) { //5/8/23 by DW
	var serverConfig = { //7/5/23 by DW
		maxFeedItems: config.maxFeedItems
		}
	if (screenname !== undefined) { //7/5/23 by DW
		serverConfig.urlUsersBlog = blog.getBlogUrl (screenname);
		}
	return (serverConfig);
	}

function handleHttpRequest (theRequest) {
	var now = new Date ();
	const params = theRequest.params;
	function returnPlainText (theString) {
		theString = (theString === undefined) ? "" : theString.toString ();
		theRequest.httpReturn (200, "text/plain", theString);
		}
	function returnHtml (htmltext) {
		theRequest.httpReturn (200, "text/html", htmltext);
		}
	function returnData (jstruct) {
		if (jstruct === undefined) {
			jstruct = {};
			}
		theRequest.httpReturn (200, "application/json", utils.jsonStringify (jstruct));
		}
	function httpReturnRedirect (url, code) { //12/26/22 by DW
		var headers = {
			location: url
			};
		if (code === undefined) {
			code = 302;
			}
		theRequest.httpReturn (code, "text/plain", code + " REDIRECT", headers);
		}
		
	function returnJsontext (jsontext) { //9/14/22 by DW
		theRequest.httpReturn (200, "application/json", jsontext.toString ());
		}
	function returnError (jstruct) {
		theRequest.httpReturn (500, "application/json", utils.jsonStringify (jstruct));
		}
	function returnOpml (err, opmltext) {
		if (err) {
			returnError (err);
			}
		else {
			theRequest.httpReturn (200, "text/xml", opmltext);
			}
		}
	function httpReturn (err, returnedValue) {
		if (err) {
			returnError (err);
			}
		else {
			if (typeof returnedValue == "object") {
				returnData (returnedValue);
				}
			else {
				returnJsontext (returnedValue); //9/14/22 by DW
				}
			}
		}
	function xmlReturn (err, xmltext) { //9/17/22 by DW
		if (err) {
			returnError (err);
			}
		else {
			theRequest.httpReturn (200, "text/xml", xmltext);
			}
		}
	function callWithScreenname (callback) {
		getScreenname (params, function (err, screenname) { //12/23/22 by DW
			if (err) {
				returnError (err);
				}
			else {
				callback (screenname);
				}
			});
		}
	
	switch (theRequest.method) {
		case "POST":
			switch (theRequest.lowerpath) {
				case "/opmlsubscribe": //6/30/22 by DW
					callWithScreenname (function (screenname) {
						subscribeToOpml (screenname, theRequest.postBody, utils.getBoolean (params.flDeleteEnabled), httpReturn);
						});
					return (true); 
				case "/sendprefs": //6/14/23 by DW
					callWithScreenname (function (screenname) {
						database.setUserPrefs (screenname, theRequest.postBody, httpReturn);
						});
					return (true);
				case config.rssCloud.feedUpdatedCallback: //10/9/22 by DW
					var jstruct = qs.parse (theRequest.postBody);
					handleRssCloudPing (jstruct.url, returnPlainText); //8/18/23 by DW
					return (true); 
				default: 
					return (false); //not consumed
				}
		case "GET":
			switch (theRequest.lowerpath) {
				case "/returnjson":
					reallysimple.readFeed (theRequest.params.url, httpReturn);
					return (true); //we handled it
				case "/returnopml":
					reallysimple.readFeed (theRequest.params.url, function (err, theFeed) {
						if (err) {
							returnError (err);
							}
						else {
							returnOpml (reallysimple.convertToOpml (theFeed));
							}
						});
					return (true); //we handled it
				case "/checkfeednow":
					database.checkOneFeed (theRequest.params.url, httpReturn);
					return (true); 
				case "/getupdatedfeed":
					database.getUpdatedFeed (theRequest.params.url, httpReturn);
					return (true); 
				case "/getfeedrec":
					database.getDatabaseFeed (theRequest.params.url, httpReturn);
					return (true); 
				case "/getfeed":
					database.getFeed (theRequest.params.url, httpReturn);
					return (true); 
				case "/deleteitem": //4/22/22 by DW
					database.deleteItem (theRequest.params.id, httpReturn);
					return (true); 
				case "/updateblogsettings": //4/28/22 by DW
					callWithScreenname (function (screenname) {
						blog.updateBlogSettings (theRequest.params.jsontext, screenname, httpReturn);
						});
					return (true); 
				case "/newblogpost": //4/28/22 by DW
					callWithScreenname (function (screenname) {
						blog.newPost (theRequest.params.jsontext, screenname, httpReturn);
						});
					return (true); 
				case "/updateblogpost": //4/30/22 by DW
					callWithScreenname (function (screenname) {
						blog.updatePost (theRequest.params.jsontext, screenname, httpReturn);
						});
					return (true); 
				case "/togglelike": //5/6/22 by DW
					callWithScreenname (function (screenname) {
						database.toggleItemLike (screenname, theRequest.params.id, httpReturn);
						});
					return (true); 
				case "/getlikes": //5/6/22 by DW
					callWithScreenname (function (screenname) {
						database.getLikes (theRequest.params.id, httpReturn);
						});
					return (true); 
				case "/getalotoflikes": //5/6/22 by DW
					callWithScreenname (function (screenname) {
						database.getALotOLikes (theRequest.params.idarray, httpReturn);
						});
					return (true); 
				case "/getlikesxml": //9/17/22 by DW
					database.buildLikesFeed (xmlReturn);
					return (true);
				case "/getfollowers": //5/18/22 by DW, 10/28/22 by DW -- no longer requires login
					database.getFollowers (theRequest.params.url, httpReturn);
					return (true); 
				case "/isusersubscribed": //5/18/22 by DW
					callWithScreenname (function (screenname) {
						database.isUserSubscribed (params.url, screenname, params.urlreadinglist, httpReturn); //10/23/23 by DW -- new param, urlreadinglist
						});
					return (true); 
				case "/getusersubcriptions": //5/20/22 by DW
					database.getSubscriptions (theRequest.params.screenname, httpReturn);
					return (true); 
				case "/setfeedsubscount": //5/21/22 by DW
					database.setFeedSubsCount (theRequest.params.url, httpReturn);
					return (true); 
				case "/opml": //5/23/22 by DW
					database.getUserOpmlSubscriptions (params.screenname, params.catname, returnOpml);
					return (true); 
				case "/opmlhotlist": //7/30/22 by DW
					database.getHotlistOpml (returnOpml);
					return (true); 
				case "/subscribe": //5/26/22 by DW
					callWithScreenname (function (screenname) {
						database.subscribeToFeed (screenname, params.url, httpReturn);
						});
					return (true); 
				case "/unsubscribe": //5/26/22 by DW
					callWithScreenname (function (screenname) {
						database.deleteSubscription (screenname, params.url, httpReturn);
						});
					return (true); 
				case "/unsublist": //6/28/22 by DW
					callWithScreenname (function (screenname) {
						var theArray = new Array ();
						try {
							theArray = JSON.parse (params.list);
							}
						catch (err) {
							returnError (err);
							}
						if (theArray.length > 0) {
							unsubList (screenname, theArray, httpReturn);
							}
						});
					return (true); 
				case "/getrecentsubscriptions": //7/23/22 by DW
					database.getRecentSubscriptions (httpReturn);
					return (true); 
				case "/gethotlist": //7/30/22 by DW
					database.getHotlist (httpReturn);
					return (true); 
				case "/getriver": //4/25/23 by DW -- get the river just using the screenname
					if (params.url === undefined) {
						if (params.screenname === undefined) { 
							callWithScreenname (function (screenname) {
								database.getRiverFromScreenname (screenname, httpReturn);
								});
							}
						else {
							database.getRiverFromScreenname (params.screenname, httpReturn);
							}
						}
					else {
						database.getRiver (params.url, params.screenname, httpReturn);
						}
					return (true); 
				case "/getriverfromlist": //8/3/22 by DW
					database.getRiverFromList (params.list, httpReturn);
					return (true); 
				case "/getriverfromopml": //8/21/22 by DW
					database.getRiverFromOpml (params.url, httpReturn);
					return (true); 
				case "/getriverfromcategory": //9/6/22 by DW
					database.getRiverFromCategory (params.screenname, params.catname, httpReturn);
					return (true);
				case "/getriverfromeverything": //10/14/22 by DW
					database.getRiverFromEverything (httpReturn);
					return (true);
				case "/getriverfromhotlist": //10/15/22 by DW
					database.getRiverFromHotlist (httpReturn);
					return (true);
				case "/getriverfromuserfeeds": //12/3/22 by DW
					database.getRiverFromUserFeeds (httpReturn);
					return (true);
				case "/getriverfromreadinglist": //11/12/23 by DW
					database.getRiverFromReadingList (params.url, httpReturn);
					return (true);
				case "/getfeeditems": //8/31/22 by DW
					database.getFeedItems (params.url, params.maxItems, httpReturn);
					return (true); 
				case "/setsubscriptioncategories": //9/4/22 by DW
					callWithScreenname (function (screenname) {
						database.setCategoriesForSubscription (screenname, params.url, params.jsontext, httpReturn);
						});
					return (true); 
				case "/getfeedsincategory": //9/6/22 by DW
					callWithScreenname (function (screenname) {
						if (params.screenname !== undefined) { //9/13/22 by DW
							screenname = params.screenname;
							}
						database.getFeedsInCategory (screenname, params.catname, httpReturn);
						});
					return (true);
				case "/getusercategories": //9/13/22 by DW
					database.getUserCategories (params.screenname, httpReturn);
					return (true);
				case "/memoryusage": //9/14/22 by DW
					returnData (viewMemoryUsage ());
					return (true);
				case "/sendprefs": //9/15/22 by DW
					callWithScreenname (function (screenname) {
						database.setUserPrefs (screenname, params.prefs, httpReturn);
						});
					return (true);
				case "/getallusers": //9/15/22 by DW
					database.getAllUsers (httpReturn);
					return (true);
				case "/getuserprefs": //9/28/22 by DW
					callWithScreenname (function (screenname) {
						database.getUserPrefs (screenname, httpReturn);
						});
					return (true);
				case "/getuserinfo": //11/10/23 by DW -- private info like apps configuration are removed from this version
					database.getUserInfo (params.screenname, httpReturn);
					return (true);
				case "/renewfeednow": //10/9/22 by DW
					database.renewFeedNow (params.url, getRssCloudOptions (), httpReturn);
					return (true);
				case "/getcurrentriverbuildlog": //10/10/22 by DW
					database.getCurrentRiverBuildLog (httpReturn);
					return (true);
				case "/getitem": //11/10/22 by DW
					database.getItemFromDatabase (params.id, function (err, itemRec) {
						if (err) {
							returnError (err);
							}
						else {
							returnData (database.convertDatabaseItem (itemRec));
							}
						});
					return (true); 
				case "/regenerateemailsecret": //12/26/22 by DW
					callWithScreenname (function (screenname) {
						regenerateEmailSecret (screenname, httpReturn);
						});
					return (true); 
				case "/getfeedsearch": //12/26/22 by DW
					database.getFeedSearch (params.searchfor, httpReturn);
					return (true); 
				case "/isuserindatabase": //1/6/23 by DW
					if (params.screenname === undefined) {
						returnData ({flInDatabase: false});
						}
					else {
						database.findUserWithScreenname (params.screenname, function (flInDatabase, userRec) {
							returnData ({flInDatabase});
							});
						}
					return (true); 
				case "/isemailindatabase": //1/12/23 by DW
					isEmailInDatabase (params.email, returnData);
					return (true); 
				case "/isfeedinriver": //2/1/23 by DW
					database.isFeedInRiver (params.url, params.cachekey, httpReturn);
					return (true); 
				case "/getserverconfig": //5/8/23 by DW
					returnData (getServerConfig (params.screenname)); //added param -- 7/5/23 by DW
					return (true);
				case "/getfeedlistfromopml": //6/2/23 by DW
					database.getFeedlistFromOpml (params.url, httpReturn);
					return (true);
				case "/newsproduct": //9/16/23 by DW
					if (params.username !== undefined) {
						renderUserNewsproduct (params.username, function (err, htmltext) {
							if (err) {
								returnError (err);
								}
							else {
								returnHtml (htmltext);
								}
							});
						}
					else {
						if ((params.template !== undefined) || (params.spec !== undefined)) {
							renderUserNewsproductWithTemplate (params.template, params.app, params.spec, theRequest, function (err, htmltext) {  //12/24/23 by DW -- new param for app, spec
								if (err) {
									returnError (err);
									}
								else {
									returnHtml (htmltext);
									}
								});
							}
						else {
							const message = "News products require either a username or template parameter.";
							returnError ({message});
							}
						}
					return (true);
				
				case "/checkreadinglist": //10/9/23 by DW
					database.checkReadingList (params.url, httpReturn);
					return (true);
				case "/subscribetoreadinglist": //10/9/23 by DW
					callWithScreenname (function (screenname) {
						database.subscribeToReadingList (screenname, params.url, httpReturn);
						});
					return (true);
				case "/unsubreadinglist": //10/13/23 by DW
					callWithScreenname (function (screenname) {
						database.deleteReadingListSubscription (screenname, params.url, httpReturn);
						});
					return (true);
				case "/getreadinglistsubscriptions": //10/13/23 by DW
					database.getReadingListSubscriptions (params.screenname, httpReturn);
					return (true);
				case "/getreadinglisstinfo": //10/19/23 by DW
					database.getReadingListsInfo (params.jsontext, httpReturn);
					return (true);
				case "/getreadinglistfollowers": //10/28/23 by DW
					database.getReadingListFollowers (params.url, httpReturn);
					return (true); 
				case "/getfeedlist": //11/6/23 by DW
					getFeedList (httpReturn);
					return (true); 
				case "/checkmyreadinglistsubs": //12/13/23 by DW
					callWithScreenname (function (screenname) {
						database.checkSubsForOneUserAndOneReadingList (screenname, params.url, httpReturn);
						});
					return (true);
				
				case "/getuserinfowithwordpresstoken": //3/23/24 by DW
					getUserInfoWithWordpressToken (params.token, httpReturn);
					return (true);
				
				case config.rssCloud.feedUpdatedCallback: //12/12/22 by DW
					returnPlainText (params.challenge);
					return (true); 
				default: 
					return (false); //not consumed
				}
			break;
		}
	
	return (false); //not consumed
	}

function logSqlCalls (options) { //9/21/23 by DW
	const now = new Date ();
	if (!options.err) { //errors are logged elsewhere, we're looking for performance problems
		var flLog = false;
		if (options.ctsecs >= config.logMinSecs) {
			flLog = true;
			}
		else {
			if (options.result !== undefined) {
				if (options.result.length > config.logMaxResults) {
					flLog = true;
					}
				}
			}
		if (flLog) {
			console.log ();
			console.log ("logSqlCalls: " + now.toLocaleTimeString () + ", ctsecs == " + options.ctsecs + ", options.result.length == " + options.result.length + ".");
			console.log ("\nlogSqlCalls: sqltext == " + options.sqltext);
			console.log ();
			}
		}
	}
function getMysqlVersion (callback) { //11/18/23 by DW
	const sqltext = "select version () as version;";
	davesql.runSqltext (sqltext, function (err, result) {
		var theVersion = undefined;
		if (!err) {
			if (result.length > 0) {
				theVersion = result [0].version;
				}
			}
		callback (undefined, theVersion);
		});
	}
function getFeedsHaveIds (callback) { //1/31/24 by DW
	const sqltext = "select feedId from feeds;";
	davesql.runSqltext (sqltext, function (err, result) {
		if (err) {
			callback (false);
			}
		else {
			callback (true);
			}
		});
	}

function everyNight () {
	if (config.flNightlyBackup) { //3/29/23 by DW
		database.backupDatabase (); 
		}
	}
function everyMinute () {
	}
function everySecond () {
	var now = new Date ();
	if (config.flRenewSubscriptions) { //10/29/22 by DW
		if (utils.secondsSince (whenLastCloudRenew) >= config.rssCloud.minSecsBetwRenews)  { //10/9/22 by DW
			database.renewNextSubscriptionIfReady (getRssCloudOptions ());
			whenLastCloudRenew = now;
			}
		}
	if (config.flUseSqlForSockets) { //9/26/23 by DW && 10/4/23 by DW
		if (utils.secondsSince (whenLastSqlSocketCheck) >= config.minSecsBetwSqlSocketChecks)  {
			notifySocketSubscribersFromSql (function (jstruct) { //10/1/23 by DW -- added callback
				database.clearCachedRivers (jstruct.item.feedUrl);
				});
			whenLastSqlSocketCheck = now;
			}
		}
	if (config.flUseReadingLists) { //10/10/23 by DW
		if (utils.secondsSince (whenLastReadingListCheck) >= config.minSecsBetwReadingListChecks)  {
			database.checkNextReadingListfReady ();
			whenLastReadingListCheck = now;
			}
		}
	if (!utils.sameDay (now, whenLastDayRollover)) {
		whenLastDayRollover = now;
		everyNight (); //8/22/22 by DW
		}
	}

function startFeedChecker () { //3/17/24 by DW
	if (config.flUpdateFeedsInBackground) {
		const ctmillisecs = config.minSecsBetwFeedChecks * 1000;
		console.log ("startFeedChecker: ctmillisecs == " + ctmillisecs);
		setInterval (database.updateNextFeedIfReady, ctmillisecs); 
		}
	}

function start () {
	var options = {
		everySecond,
		everyMinute,
		httpRequest: handleHttpRequest, 
		publishFile: publishFileCallback, //3/18/22 by DW
		addMacroToPagetable, //4/30/22 by DW
		asyncAddMacroToPagetable, //12/2/22 by DW
		addEmailToUserInDatabase, //12/7/22 by DW
		getScreenname, //12/23/22 by DW
		getScreenNameFromEmail, //1/10/23 by DW
		findUserWithScreenname: database.findUserWithScreenname, //2/15/23 by DW & 11/4/23 by DW
		findUserWithEmail: database.findUserWithEmail, //11/4/23 by DW
		loginWordpressUser, //10/31/23 by DW
		isUserAdmin //11/3/23 by DW
		}
	daveappserver.start (options, function (appConfig) {
		for (var x in appConfig) {
			config [x] = appConfig [x];
			}
		if (config.flStaticFilesInSql) { //9/20/23 by DW
			appConfig.getStaticFile = getStaticFileInSql;
			appConfig.publishStaticFile = publishStaticFileInSql;
			}
		reallysimple.setConfig ({timeOutSecs: config.httpRequestTimeoutSecs}); //2/26/24 by DW
		blog.start (config, function () {
			config.database.logCallback = logSqlCalls; //9/21/23 by DW
			davesql.start (config.database, function () {
				getMysqlVersion (function (err, mysqlVersion) { //11/18/23 by DW, 2/1/24; 11:22:16 AM by DW
					config.mysqlVersion = mysqlVersion;
					getFeedsHaveIds (function (flFeedsHaveIds) { //1/31/24 by DW, 2/1/24; 11:22:16 AM by DW
						config.flFeedsHaveIds = flFeedsHaveIds;
						console.log ("start: config.flFeedsHaveIds == " + config.flFeedsHaveIds); 
						database.start (config, function () {
							if (config.flWebsocketEnabled && config.flUseSqlForSockets) { //9/26/23 by DW
								initLastNewItem (); //9/26/23 by DW
								}
							if (config.flBackupOnStartup) { //1/9/23 by DW
								database.backupDatabase (); 
								}
							if (config.flUpdateFeedsInBackground) { //3/17/24 by DW
								startFeedChecker ();
								}
							});
						});
					});
				});
			});
		});
	}
