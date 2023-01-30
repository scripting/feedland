const myVersion = "0.4.25", myProductName = "feedland"; 

exports.start = start; //1/18/23 by DW

const fs = require ("fs");
const request = require ("request");
const utils = require ("daveutils");
const daveappserver = require ("daveappserver"); //9/13/22 by DW
const davetwitter = require ("davetwitter"); 
const davesql = require ("davesql");
const reallysimple = require ("reallysimple");
const opml = require ("opml");
const database = require ("feedlanddatabase");
const blog = require ("./blog.js");
const process = require ("process"); //9/14/22 by DW
const qs = require ("querystring"); //10/9/22 by DW

var config = {
	urlForFeeds: "http://data.feedland.org/feeds/", //11/5/22 by DW
	s3PathForFeeds: "/data.feedland.org/feeds/",
	
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
	urlFeedlandApp: "http://feedland.org/", //11/10/22 by DW
	
	flBackupOnStartup: false, //1/9/23 by DW
	
	flNewsProducts: false, //1/20/23 by DW
	flUserFeeds: false, 
	flLikesFeeds: false, 
	
	urlStarterFeeds: "http://scripting.com/publicfolder/feedland/subscriptionLists/starterfeeds.opml" //1/22/23 by DW
	};

var whenLastDayRollover = new Date ();
var whenLastFeedCheck = new Date ();
var whenLastCloudRenew = new Date ();
var emailCache = new Object (); //12/14/22 by DW

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
	
	//12/2/22 by DW -- set up the normal case for the Facebook/Twitter metadata
		pagetable.metaUrl = "http://feedland.org/";
		pagetable.metaTitle = "FeedLand";
		pagetable.metaDescription = "The first full feed management system. Share lists of feeds with other users, both in and outside of FeedLand. Writing feeds, reading news.";
		pagetable.metaTwitterOwnerName = "@davewiner";
		pagetable.metaSiteName = "FeedLand";
		
		const imgUrl = "http://scripting.com/images/2022/10/20/someoneElsesFeedList.png";
		pagetable.facebookImage = "<meta property=\"og:image\" content=\"" + imgUrl + "\" />";
		pagetable.twitterImage = "<meta name=\"twitter:image:src\" content=\"" + imgUrl + "\">";
	
	}

function addEmailToUserInDatabase (screenname, emailAddress, magicString, flNewUser, callback) { //12/7/22 by DW
	database.isUserInDatabase (screenname, function (flInDatabase, userRec) {
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
				callback (undefined, result [0]);
				}
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
	function tryWithTwitterLogin () {
		davetwitter.getScreenName (params.oauth_token, params.oauth_token_secret, function (screenname) {
			if (screenname === undefined) {
				callback ({message: "Can't do the thing you want because the accessToken is not valid."});    
				}
			else {
				callback (undefined, screenname);
				}
			});
		}
	
	if ((params.emailaddress !== undefined) && (params.emailcode !== undefined)) { //xxx
		getUserRecFromEmail (params.emailaddress, params.emailcode, function (err, userRec) {
			if (err) {
				tryWithTwitterLogin ();
				}
			else {
				callback (undefined, userRec.screenname);
				}
			});
		}
	else {
		tryWithTwitterLogin ();
		}
	}

function everyNight () { //8/22/22 by DW
	database.backupDatabase (); 
	}
function everyMinute () {
	}
function getRssCloudOptions () {
	let options = new Object ();
	for (var x in config.rssCloud) {
		options [x] = config.rssCloud [x];
		}
	
	options.port = 80; //12/12/22; 1:18:17 PM by DW
	options.domain = "feedland.org";
	
	let appconfig = daveappserver.getConfig ();
	options.websocketPort = (appconfig.flWebsocketEnabled) ? appconfig.websocketPort : undefined;
	return (options);
	}
function everySecond () {
	var now = new Date ();
	if (config.flRenewSubscriptions) { //10/29/22 by DW
		if (utils.secondsSince (whenLastCloudRenew) >= config.rssCloud.minSecsBetwRenews)  { //10/9/22 by DW
			database.renewNextSubscriptionIfReady (getRssCloudOptions ());
			whenLastCloudRenew = now;
			}
		}
	if (utils.secondsSince (whenLastFeedCheck) >= config.minSecsBetwFeedChecks)  {
		database.updateNextFeedIfReady ();
		whenLastFeedCheck = now;
		}
	if (!utils.sameDay (now, whenLastDayRollover)) {
		whenLastDayRollover = now;
		everyNight (); //8/22/22 by DW
		}
	}
function handleHttpRequest (theRequest) {
	var now = new Date ();
	const params = theRequest.params;
	function returnPlainText (s) {
		theRequest.httpReturn (200, "text/plain", s.toString ());
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
				case config.rssCloud.feedUpdatedCallback: //10/9/22 by DW
					var jstruct = qs.parse (theRequest.postBody);
					database.checkOneFeed (jstruct.url, function (err, data) {
						returnPlainText ("Thanks for the update! ;-)");
						});
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
						database.isUserSubscribed (theRequest.params.url, screenname, httpReturn);
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
				case "/getriver":
					if (params.screenname === undefined) { 
						callWithScreenname (function (screenname) {
							database.getRiver (params.url, screenname, httpReturn);
							});
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
						database.isUserInDatabase (params.screenname, function (flInDatabase, userRec) {
							returnData ({flInDatabase});
							});
						}
					return (true); 
				case "/isemailindatabase": //1/12/23; 11:54:04 AM by DW
					isEmailInDatabase (params.email, returnData);
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
var options = {
	everySecond,
	everyMinute,
	httpRequest: handleHttpRequest, 
	publishFile: publishFileCallback, //3/18/22 by DW
	addMacroToPagetable, //4/30/22 by DW
	asyncAddMacroToPagetable, //12/2/22 by DW
	addEmailToUserInDatabase, //12/7/22 by DW
	getScreenname, //12/23/22 by DW
	getScreenNameFromEmail //1/10/23 by DW
	}
function start () {
	daveappserver.start (options, function (appConfig) {
		for (var x in appConfig) {
			config [x] = appConfig [x];
			}
		blog.start (config, function () {
			davesql.start (config.database, function () {
				database.start (config, function () {
					if (config.flBackupOnStartup) { //1/9/23 by DW
						database.backupDatabase (); 
						}
					});
				});
			});
		});
	}
