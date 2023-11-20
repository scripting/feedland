11/20/23; 8:47:30 AM by DW

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

