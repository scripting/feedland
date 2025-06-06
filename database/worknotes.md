#### 6/6/25; 11:41:22 AM by DW

When checking items for changes, we weren't checking outlineJsontext.

#### 6/2/25; 11:54:16 AM by DW -- v0.8.0

We incorrectly assumed that incoming feed records will have image attributes laid out like this:

* theFeed = {imageUrl, imageTitle, imageLink, imageWidth, imageHeight, imageDescription};

But that isn't the way it works. Instead what comes in is this:

* theFeed = {image: {url, title, link, width, height, description}}

We do the conversion in setupNewFeedRec.

#### 5/31/25; 2:18:18 PM by DW

New config option, legalTags, configures what HTML you allow to pass from a feed into the database. The default is to let through <p> and <br>.

#### 6/28/24; 11:23:10 AM by DW

Remove debugging code added to checkReadingList to track down breaking change fix yesterday.

#### 6/27/24; 9:09:57 AM by DW

Breaking change in the move to mysql2, it changed the way it deals with JSON objects in tables, it parses them. 

https://github.com/scripting/feedlandInstall/issues/60

Added a long comment at the head of checkReadingList explaining what it does and how it works. 

New function -- addFeedIfNecessary -- called it from addFeedsIfNecessary. Does the minimum necessary to be sure the feed is in the database.

Added lots of debugging code.

#### 6/24/24; 9:29:48 AM by DW

Formatting change for title and description in OPML subscription lists we generate. See getUserOpmlSubscriptions.

#### 6/20/24; 8:51:33 AM by DW

Fixed a crashing bug in subscribeToReadingList. 

#### 4/29/24; 9:26:53 AM by DW

One of my servers was using up space at an alarming rate. I investigated and found it was accumulating a lot of files in the feedland <i>data</i> folder, <i>riverBuildLogs</i> sub-folder.

It felt familiar, like we had been here before, and we did on on 10/20/23. The <a href="https://github.com/scripting/feedland/blob/main/database/worknotes.md#102023-112957-am-by-dw">worknote</a> says that <i>config.flRiverBuildLogEnabled</i> would now default to false, but I checked the code, and it's still defaulting to true. 

This time I changed it for real, I hope, and any servers out there that are writing lots of files that are only useful for a certain kind of debugging, will stop doing so on the next restart. 

BTW, you might want to look in the <i>data/riverBuildLogs</i> folder and delete the files.

#### 3/17/24; 10:51:07 AM by DW

The logging message in checkOneFeed now says how many seconds it took.

#### 3/9/24; 10:59:19 AM by DW

In addSubscription, we assumed feedId can't be null, but the value passed to us is sometimes null, due to an earlier coding error when we quickly added feedId's as an experiment. We went crazy there. Still paying for it, fixing a bug that was added over a month ago. 

Fixed crashing bug when we were saving a new feed. It was in some debugging code I added to debug another feature. Still paying for the attempt to quickly add feedId. Not a good thing to try when your attention is not in DatabaseLand. 

Commented out the console.log statement. 

#### 3/4/24; 4:53:53 PM by DW

feedland.org is running really slowly, and the slowness is traced to using <i>index (feedId)</i> in the query in getRiver. 

we didn't know what we were doing when we were trying out new queries earlier this year. 

must remember to treat this app with more respect in the future. 

#### 3/2/24; 12:07:02 PM by DW

getRiverFromEverything was broken. The fix was in getRiver.

#### 3/2/24; 9:58:45 AM by DW

Rewrote saveFeed function.

https://github.com/scripting/feedlandDev/issues/7

#### 2/26/24; 1:02:16 PM by DW

New config setting -- config.flCanUseFeedIds, defaults to true.

I suspect the code that uses feedId's to build rivers. It was never necessary on Digital Ocean servers, and did not improve performance on VIP. 

Even so we leave the default at true. I want to try setting it false on my new test server and see what happens. 

#### 2/22/24; 9:13:25 AM by DW

I added some test code when it was building the All category for user davewiner. 

The hope was it would make the query run faster, but it actually ran slower, so I commented the test code. 

Notes on the idea are below.

For at least a month we've been trying to figure out why my <i>All</i> category takes 18 seconds to render where it used to take less than one second, as do all my other categories. This takes people focusing on it from the FeedLand point of view and from the OS/SQL standpoint. We haven't gotten together on this, and it doesn't seem likely we will in the near future. In the meantime I can't help but come up with my own ideas about how to work around this problem. Limit the number of feeds in a category? Or -- my current thought -- include feeds that have updated in the last 48 hours say. That's another query, but I think it might work! Or another approach, limit it to the 200 feeds that have updated most recently. 200 seemed to be a magic number. If I cut the All category down to 200 feeds it got a lot faster. 

https://github.com/scripting/feedlandDev/issues/4

So I'm going to give it a try now.

#### 2/12/24; 2:01:27 PM by DW

Using a different index in getRiver.

#### 2/7/24; 4:18:17 PM by DW

Trying to speed up river building by limiting results from a river to a configurable number of days. 

confi

#### 2/3/24; 4:29:40 PM by DW

Converted getRiver and getRiverFromCategory to use feedIds if they're available.

#### 2/3/24; 10:21:32 AM by DW

These are the changes needed to get the server running again after transitioning to having a feedId column for the three main tables: feeds, items and subscriptions. 

1. When we create a new subscription, set the <i>feedId</i> for the subscription record. 

2. When we create a new item, set the <i>feedId</i> for the item record. 

The trickiest part was handling new subscriptions made by new feeds appearing in a reading list. That should be carefully tested to make sure the new subscription record has a feedId value properly set. 

#### 1/31/24; 10:46:24 AM by DW

As part of the conversion for config.flFeedsHaveIds, in getFeedsInCategory, we request f.feedId so it's returned to the client for each feed, so it can construct queries that use the feedId in place of feedUrl. 

Added code to return f.feedId in getStandardFeedElements. 

#### 12/16/23; 12:07:17 PM by DW

Disabled the deleteItem call, we don't respect flDeleted att on items. So this is pointless. 

#### 12/14/23; 11:41:07 AM by DW

Fixed a problem, when we discover a new feed in a reading list, we set its category string incorrectly. It needed to be surrounded by commas. 

We encountered and fixed this problem before on 11/19/23.

#### 12/13/23; 12:32:40 PM by DW

Fixed bugs in reading list code. 

#### 12/1/23; 12:18:34 PM by DW

What do we do when a user subscribes to a reading list? 

We return before doing it all.

And we do less -- just checking if each of the feeds in the list are in the database if they exist. 

We want the readouts in feedlandHome to look correct as soon as possible.

The truth is subscribing to a new reading list takes as much time as subscribing from a list, and that can take a second for each feed. 

There is an art to this, we're still not doing it right in some circumstances. 

#### 11/30/23; 4:12:41 PM by DW

Fixed problem with importing reading list feeds that don't have any categories. We were assigning the value of category in the database as 

,undefined,

Instead we return undefined which should be represented in the database as NULL.

To find the code search for getCategoriesFor.

#### 11/28/23; 2:13:35 PM by DW

Implement support for source:cloud element. 

#### 11/28/23; 11:47:16 AM by DW

Subscribing to new reading list, we were failing to add most of the feeds to the feeds table in the database. 

The debugging work is narrated in <a href="https://github.com/scripting/a8c-FeedLand-Support/issues/67">this thread</a>  on GitHub.

#### 11/20/23; 8:47:30 AM by DW

Removing checks for flDeleted for a performance boost. 

https://github.com/scripting/feedlandInstall/issues/51

Being cautious, I made it easy to turn this back on, with config.flCheckForDeleted which defaults false. 

But I recommend when and if this feature needs to come back, we implement it by actually deleting the item in the database. 

#### 11/19/23; 9:33:55 AM by DW

When we create the subscription record, we stored the categories incorrectly. They need to be surrounded by commas, or they won't be found when building a river based on categories. I wrote up the process in this <a href="https://github.com/scripting/a8c-FeedLand-Support/issues/67">thread.</a>

#### 11/5/23; 11:26:37 AM by DW

When you add a field to the users table, you have to add a line of code to setUserPrefs. Otherwise the new thing will fall back to its default value every time prefs are changed. 

#### 10/23/23; 9:42:27 AM by DW

When checking if a feed changed it's possible for a comparison to fail, not sure which field, or why. 

I wrapped the check in a try statement so that should take care of the error. 

#### 10/20/23; 11:29:57 AM by DW

config.flRiverBuildLogEnabled was defaulting true, and used up all the disk space on the feedland.org server. This was a mistake. I changed it to default to false. 

#### 10/20/23; 10:15:18 AM by DW

If you try to subscribe to a feed but it's not a feed, it's html, we look for a <link> element in the html that points to an RSS or Atom feed, and use that instead.

#### 10/16/23; 11:31:41 AM by DW

Fixed bug where urlReadingList would be undefined, would cause the server to crash.

#### 10/12/23; 8:55:00 AM by DW

Support for reading lists is ready.

#### 10/4/23; 12:07:22 PM by DW

Don't call clearCachedRivers if config.flUseSqlForSockets is true.

#### 10/3/23; 4:28:08 PM by DW

Added debugging code for the river cache. 

We now log when we add a river to the cache, or delete a river because a feed it uses updated, or because it aged-out. 

The names of the routines should tell you which is happening.

#### 10/1/23; 10:19:34 AM by DW -- v0.6.25

Export clearCachedRivers so it can be called from the SQL socket subscriber code.

When we send notification to users that a feed has updated, we can also send that info to the river cache, so we can turn caching back on.

#### 9/27/23 AM by DW -- v0.6.24

Exported convertItemList, needed it in the code for the SQL based websocket notifications. 

#### 9/13/23 by DW

two new config values:

flUseRiverCache, ctSecsLifeRiverCache

they used to be internal constants with values true and 15 * 60 (15 minutes).

i want it to be possible to turn the cache off altogether, and make each river query go to the database, or to make the lifetime much shorter, so we can get closer to real time updates. 

#### 8/18/23 by DW

Started adding back console.log calls. 

checkOneFeed

rssCloudRenew

#### 7/14/23 by DW -- v0.6.14

New -- config.maxGetAllUsers -- it's the number of users database.getAllUsers will return.

#### 6/8/23 by DW

In getFeedlistFromOpml, return an error if the OPML file has no feeds.

#### 5/27/23 by DW

When saving an item, remove null values before generating the query. 

#### 5/25/23 by DW -- v0.6.0

added a new column to the user table for user prefs -- apps.

new apps must have a way of storing stuff on the server, start moving away from prefs.json file.

alter table users add apps json;

#### 5/11/23 by DW

Fixed all kinds of problems in setUserPrefs. See comment at the head of the routine. 

#### 5/7/23 by DW

Major change to setUserPrefs.

Previously we would assign to all columns in a users table record, even if the caller only provided a few values.

This comes up in marktwain because it doesn't do anything with tabs and categories, for example, or news products.

If an element of an object has the value undefined, when we encode the values, it is changed to NULL and that overwrites whatever was in that column.

Now we add to the userRec more carefully, only adding values that are provided in the object provided by the caller.

#### 4/25/23 by DW

New routine -- getRiverFromScreenname.

See this thread for the reason this was needed.

https://github.com/scripting/feedlandInstall/issues/31

Turned off GitHub nightly backup by default.

config.githubBackup.enabled

#### 3/21/23 by DW

In likes feeds, the listname is not a twitter identifier.

#### 1/22/23 by DW -- 0.5.3

If config.flLikesFeeds is false don't build likes feeds.

#### 10/24/22 by DW

getAllUsers now returns ctSubs for each user.

#### 10/15/22 by DW

alter table items add likes text;

#### 9/26/22 by DW -- 0.4.20

Added news product prefs to users table.

alter table users add newsproductCategoryList text;

alter table users add newsproductTitle text;

alter table users add newsproductDescription text;

alter table users add newsproductImage text;

alter table users add newsproductStyle text;

alter table users add newsproductScript text;

#### 9/23/22 by DW

Backup the hotlist every night. 

#### 9/18/22 by DW

select * from likes order by whenCreated desc limit 25;

#### 9/17/22 by DW

new fields for users

* alter table users add ctStartups int default 0;

* alter table users add whenLastStartup datetime;

* alter table users add whenCreated datetime;

<i>likes</i> move into feedlanddatabase.js

buildLikesFeed function in the interface

#### 9/6/22 by DW -- 0.4.18

pulling out a category for a user

* select * from subscriptions where listname = 'davewiner' and categories like '%tech,%';

* select * from subscriptions where categories like '%tech,%';

Includes all the code that was previously in viewer.js.

* getSubscriptions

* getUsersOpmlUrl

* getUserOpmlSubscriptions

* getHotlist

* getHotlistOpml

#### 8/30/22 by DW -- 0.4.16

Started private <a href="https://github.com/scripting/feedlandDatabase">feedlandDatabase</a> repo on GitHub.

Lots of work done since 8/19, no notes. Sorry. ;-)

#### 8/19/22 by DW

Subscribing is too slow. Trying an experiment, to return before all the items are checked. Let that happen in an independent thread.

#### 7/23/22 by DW

New function: getRecentSubscriptions for the log page.

#### 7/20/22 by DW

Add new column to feeds whoFirstSubscribed.

config.maxNewFeedSubscriptions says how many new subscriptions a user can do. no limit to the number of subscriptions overall.

#### 7/12/22 by DW

Lots of changes with no notes, sorry.

#### 7/3/22 by DW -- 0.4.15

Left out the <i>readWholeFile</i> config callback linking to daveappserver, added. 

We're no longer maintaining feeds.opml. via config.flMaintainFeedsOpml. You should not turn it on, it won't work. It was there so that when you subscribed to a single feed, it would automatically be added to the user's feeds.opml file. But that was before we switched to using the simpler feed editor. It's still possible to use an outliner to edit your feed list, but it is no longer integrated with the database system. 

#### 7/2/22 by DW -- 0.4.11

When looking for the next feed to check, only consider feeds with 1 or more subscribers.

The new version of the reallySimple package tells us how many seconds it took to read the feed, so we no longer have to figure that out for ourselves. 

#### 7/1/22 by DW -- 0.4.7

When recording an error we were't setting whenLastError in the feedrec.

Fixed a bug that broke the ctSecs value in a feedrec.

Fixed a bug in ctConsecutiveErrors in a feedrec. It wasn't being reset to 0 when there was no error.

Log when we check a feed. I need to be able to see this.

ctSecs in the feedRec wasn't being set if the feed didn't change. 

#### 6/30/22 by DW

Change to processSubscriptionList.

New optional param, flDeleteEnabled. Defaults true, which is the original behavior. It syncs the OPML text provided with your subscriptions. Any feeds that are present are subscribed to, any that are not are unsubbed. 

Set it false if you want to import an OPML list, not sync.

#### 6/27/22 by DW

Pulled out of main project to be a standalone package, so you can build apps that access the database with a different or no user interface.

Calls to other modules, daveappserver and viewers, transitioned to callbacks in the options object passed to database.start.

