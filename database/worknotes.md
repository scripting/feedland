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

