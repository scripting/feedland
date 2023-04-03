const fs = require ("fs"); 
const marked = require ("marked"); 
const request = require ("request"); 
const utils = require ("daveutils");
const rss = require ("daverss");
const s3 = require ("daves3");
const davesql = require ("davesql");
const database = require ("feedlanddatabase");

exports.updateBlogSettings = updateBlogSettings;
exports.newPost = newPost;
exports.updatePost = updatePost;
exports.getBlogUrl = getBlogUrl;
exports.buidUsersFeed = buildRss; //11/6/22 by DW
exports.start = start;

var config = {
	};

function markdownProcess (s, flGenerateHtmlParagraphs=false) {
	var renderer = new marked.Renderer ();
	var options = {
		renderer: renderer
		};
	if (flGenerateHtmlParagraphs) {
		return (marked (s, options));
		}
	else {
		renderer.paragraph = function (s) {
			return (s);
			};
		return (marked (s, options));
		}
	}
function getBlogUrl (screenname) {
	var urlfeed = config.urlForFeeds + screenname + ".xml", jstruct;
	return (urlfeed);
	}
function getBlogLinkValue (screenname) { //11/9/22 by DW
	return (config.urlFeedlandApp + "?river=" + config.urlForFeeds + screenname + ".xml");
	}
function buildRss (screenname, callback) {
	const feedUrl = getBlogUrl (screenname), whenstart = new Date ();
	function notNull (val) {
		if (val === undefined) {
			return (false);
			}
		if (val == null) {
			return (false);
			}
		return (true);
		}
	function checkNull (val) {
		if (notNull (val)) {
			return (val);
			}
		return (undefined);
		}
	function fixMediumEditorQuirks (theText) {
		if (utils.endsWith (theText, "\n")) { //7/14/22 by DW
			theText = utils.stringMid (theText, 1, theText.length - 1);
			}
		var splits = theText.split ("<p>");
		if (splits.length == 2) {
			if (utils.beginsWith (theText, "<p>") && utils.endsWith (theText, "</p>")) {
				theText = utils.stringDelete (theText, 1, 3);
				theText = utils.stringMid (theText, 1, theText.length - 4);
				}
			}
		return (theText);
		}
	database.isFeedInDatabase (feedUrl, function (flInDatabase, feedRec) {
		if (flInDatabase) {
			database.getUserPrefs (screenname, function (err, thePrefs) { //11/6/22 by DW
				var title = checkNull (feedRec.title);
				var description = checkNull (feedRec.description);
				if (!err) {
					title = thePrefs.myFeedTitle;
					description = thePrefs.myFeedDescription;
					}
				
				var htmlUrl = checkNull (feedRec.htmlUrl); //11/9/22 by DW
				if (htmlUrl === undefined) {
					htmlUrl = getBlogLinkValue (screenname);
					}
				
				var headElements = {
					title: checkNull (title),
					link: htmlUrl, //11/9/22 by DW
					description: checkNull (description),
					language: checkNull (feedRec.language),
					
					generator: config.generatorForFeed, //7/14/22 by DW
					
					docs: config.docsForFeed, //7/14/22 by DW
					
					twitterScreenName: checkNull (feedRec.twitterAccount),
					maxFeedItems: config.maxFeedItems,
					
					flRssCloudEnabled: true, 
					rssCloudDomain: "rpc.rsscloud.io",
					rssCloudPort: 5337,
					rssCloudPath: "/pleaseNotify",
					rssCloudRegisterProcedure: "",
					rssCloudProtocol: "http-post"
					};
				const sqltext = "select * from items where flDeleted=false and feedUrl=" + davesql.encode (feedUrl) + " order by pubDate desc limit " + config.maxFeedItems + ";"; 
				davesql.runSqltext (sqltext, function (err, result) {
					if (err) {
						if (callback !== undefined) {
							callback (err);
							}
						}
					else {
						var historyArray = new Array ();
						result.forEach (function (item) {
							var description = checkNull (item.description); //5/3/22 by DW
							if (description !== undefined) {
								description = fixMediumEditorQuirks (description);
								}
							
							var enclosure = undefined; //4/3/23 by DW
							if (notNull (item.enclosureUrl) && notNull (item.enclosureLength) && notNull (item.enclosureType)) { //4/3/23 by DW
								enclosure = {
									url: item.enclosureUrl,
									length: item.enclosureLength,
									type: item.enclosureType
									}
								}
							
							historyArray.push ({
								title: checkNull (item.title),
								text: description,
								link: item.guid, //11/11/22 by DW
								markdowntext: checkNull (item.markdowntext), //5/5/22 by DW
								when: item.pubDate,
								enclosure, //4/3/23 by DW
								guid: {
									flPermalink: utils.beginsWith (item.guid, config.urlFeedlandApp),
									value: item.guid
									}
								});
							});
						
						var xmltext = rss.buildRssFeed (headElements, historyArray); 
						var s3Path = config.s3PathForFeeds + screenname + ".xml";
						s3.newObject (s3Path, xmltext, "text/xml", "public-read", function (err, data) {
							if (err) {
								console.log ("buildRss: s3Path == " + s3Path + ", err.message == " + err.message);
								if (callback !== undefined) {
									callback (err);
									}
								}
							else {
								database.checkOneFeed (feedUrl, function () { //11/5/22 by DW
									rss.cloudPing (undefined, feedUrl); 
									});
								if (callback !== undefined) {
									callback (undefined, feedRec);
									}
								}
							});
						
						var f = config.localRssPath + screenname + ".xml";
						utils.sureFilePath (f, function () {
							fs.writeFile (f, xmltext, function (err) {
								if (err) {
									console.log ("buildRss: err.message == " + err.message);
									}
								});
							});
						}
					});
				});
			}
		else {
			console.log ("blog.buildRss: feedUrl == " + feedUrl + " is not in the database.");
			if (callback !== undefined) {
				callback ({message: "Can't build the feed because it's not in the database."});
				}
			}
		});
	}
function updateBlogSettings (jsontext, screenname, callback) {
	var message = "We no longer manage blog settings this way."; //11/7/22 by DW
	callback ({message});
	return;
	
	callback (undefined, new Object ()); //11/6/22 by DW
	return;
	}
function addFeedIfNecessary (screenname, callback) { //5/8/22 by DW
	var feedUrl = getBlogUrl (screenname), whenstart = new Date (), feedRecFromClient;
	database.isFeedInDatabase (feedUrl, function (flInDatabase, feedRec) {
		if (flInDatabase) {
			callback (undefined, feedRec);
			}
		else {
			var feedRec = {
				feedUrl,
				htmlUrl: getBlogLinkValue (screenname), //11/9/22 by DW
				title: screenname + "'s feed",
				pubDate: whenstart,
				whenCreated: whenstart,
				whenUpdated: whenstart,
				twitterAccount: screenname, 
				generator: config.generatorForFeed,
				docs: config.docsForFeed,
				
				ctErrors: 0,
				ctConsecutiveErrors: 0,
				errorString: "",
				whenChecked: whenstart, 
				ctChecks: 0, 
				whenLastError: new Date (0)
				};
			database.saveFeed (feedRec, function (err, data) {
				if (err) {
					callback (err);
					}
				else {
					callback (undefined, feedRec);
					}
				});
			}
		});
	}


function getEnclosureInfo (enclosureUrl, callback) { //4/3/23 by DW
	var options = {
		method: "HEAD",
		uri: enclosureUrl
		};
	request (options, function (err, response, body) {
		if (err) {
			callback (err);
			}
		else {
			if (response.statusCode != 200) {
				const message = "Can't get enclosure info because there was an error.";
				callback ({message});
				}
			else {
				const jstruct = {
					length: response.headers ["content-length"],
					type: response.headers ["content-type"]
					}
				callback (undefined, jstruct);
				}
			}
		});
	}

function checkEnclosure (itemRec, callback) { //4/3/23 by DW
	function isNull (val) {
		if (val === undefined) {
			return (true);
			}
		if (val == null) {
			return (true);
			}
		return (false);
		}
	if (isNull (itemRec.enclosureUrl)) { 
		callback ();
		}
	else {
		if (isNull (itemRec.enclosureType) || isNull (itemRec.enclosureLength)) {
			getEnclosureInfo (itemRec.enclosureUrl, function (err, data) {
				if (err) {
					callback (err);
					}
				else {
					itemRec.enclosureType = data.type;
					itemRec.enclosureLength = data.length;
					callback (undefined);
					}
				});
			}
		else {
			callback ();
			}
		}
	}

function newPost (jsontext, screenname, callback) {
	var feedUrl = getBlogUrl (screenname), itemRecFromClient, whenstart = new Date ();
	var itemRec = {
		feedUrl,
		id: undefined, //7/12/22 by DW
		guid: undefined, //7/12/22 by DW
		pubDate: whenstart,
		whenCreated: whenstart,
		whenUpdated: whenstart,
		flDeleted: false,
		outlineJsontext: undefined,
		markdowntext: undefined
		};
	try {
		itemRecFromClient = JSON.parse (jsontext);
		}
	catch (err) {
		callback (err);
		return;
		}
	
	if (itemRecFromClient.markdowntext !== undefined) { //5/5/22 by DW
		itemRecFromClient.description = markdownProcess (itemRecFromClient.markdowntext, true);
		}
	for (var x in itemRecFromClient) {
		itemRec [x] = itemRecFromClient [x];
		}
	
	checkEnclosure (itemRec, function (err) { //4/3/23 by DW
		database.saveItem (itemRec, function (err, result) {
			if (err) {
				callback (err);
				}
			else {
				itemRec.id = result.insertId; //7/12/22 by DW
				itemRec.guid = config.urlFeedlandApp + "?item=" + itemRec.id; //11/10/22 by DW
				database.saveItem (itemRec, function () { //save again so guid makes it into the database -- 7/12/22 by DW
					addFeedIfNecessary (screenname, function (err, feedRec) {
						database.subscribeToFeed (screenname, feedUrl, function (err, feedRec) { //11/5/22 by DW
							buildRss (screenname, function (err, feedRec) {
								if (err) { //11/9/22 by DW
									console.log ("newPost: err.message == " + err.message);
									callback (err);
									}
								else {
									feedRec.whenUpdated = whenstart;  
									var jstruct = {
										item: database.convertDatabaseItem (itemRec),
										theFeed: database.convertDatabaseFeed (feedRec)
										}
									database.updateSocketSubscribers ("newItem", jstruct);
									database.saveFeed (feedRec, function () {  
										callback (undefined, database.convertDatabaseItem (itemRec));
										});
									}
								});
							});
						});
					});
				}
			});
		});
	}
function updatePost (jsontext, screenname, callback) {
	var feedUrl = getBlogUrl (screenname), itemRecFromClient, whenstart = new Date ();
	try {
		itemRecFromClient = JSON.parse (jsontext);
		}
	catch (err) {
		callback (err);
		return;
		}
	if (itemRecFromClient.markdowntext !== undefined) { //5/5/22 by DW
		itemRecFromClient.description = markdownProcess (itemRecFromClient.markdowntext, true);
		}
	database.isItemInDatabase (feedUrl, itemRecFromClient.guid, function (flThere, itemRec) {
		if (flThere) {
			for (var x in itemRecFromClient) { //4/2/23 by DW
				itemRec [x] = itemRecFromClient [x];
				}
			checkEnclosure (itemRec, function (err) { //4/3/23 by DW
				database.saveItem (itemRec, function (err, feedRec) {
					if (err) {
						callback (err);
						}
					else {
						buildRss (screenname, function (err, feedRec) {
							var jstruct = {
								item: database.convertDatabaseItem (itemRec),
								theFeed: database.convertDatabaseFeed (feedRec)
								}
							database.updateSocketSubscribers ("updatedItem", jstruct);
							callback (undefined, database.convertDatabaseItem (itemRec));
							});
						}
					});
				});
			}
		else {
			callback ({message: "Can't update the item because it isn't in the database."});
			}
		});
	}
function start (options, callback) {
	if (options !== undefined) {
		for (var x in options) {
			config [x] = options [x];
			}
		}
	if (callback !== undefined) {
		callback (undefined);
		}
	}
