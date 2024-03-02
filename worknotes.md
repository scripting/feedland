#### 2/26/24; 11:09:49 AM by DW

New config setting -- config.httpRequestTimeoutSecs, defaults to 1.

It's a setting for the reallySimple package that does all our feed reading. 

Down there the default value is 10. 

Really any feed that can't be read in 1 second is trouble. 

I've wanted to fix this for a long time. 

#### 2/1/24; 11:18:11 AM by DW

If you want a config value to make it to config in database, it must be set brefore we call database.start.

We were doing it in the wrong order for config.mysqlVersion and config.flFeedsHaveIds. 

Also changed the initial value for config.flFeedsHaveIds to undefined. If it had this value, I would have found the problem yesterday instead of today. 

#### 1/31/24; 10:33:51 AM by DW

Beginning an upgrade to feedland.org and feedland.com to use feedId in addition to feedUrl in the feeds and subscriptions tables. 

The goal is to optimize building of rivers, and possibly other things in the future. 

First change is adding a new value to config -- flFeedsHaveIds. This is initialized at startup, by seeing if it's an error to ask about feedId in the feeds table. 

#### 1/24/24; 9:02:43 AM by DW

The call to render a news product now checks if the spec parameter is JSON, and if it is, that's the spec.  Otherwise we assume, as before, that it's the URL of the spec, and we read it.

Look in renderUserNewsproductWithTemplate.

#### 1/9/24; 1:47:49 PM by DW

Fixed a couple of problems with productNameForDisplay for news products.

#### 12/28/23; 10:33:38 AM by DW

A new way of specifying a news product, using a JSON file in place of OPML. 

Biggest changes in `renderUserNewsproductWithTemplate`.

#### 12/24/23; 10:08:48 AM by DW

In /newsproduct call, allow the caller to specify the URL of the source of the newsproduct app.

This makes it easy for me to test a new version of the app without disturbing the previous version.

https://feedland.com/newsproduct?template=<opmlurl>&app=<appurl>

This is only for the templated version, keep everything simple for product specified by the username.

#### 12/1/23; 12:40:11 PM by DW

Clean out twitter and facebook metadata. 

#### 11/28/23; 12:30:56 PM by DW

We no longer generate source:account feed-level for twitter. 

#### 11/22/23; 11:46:16 AM by DW

New config value, rssCloudNotifyDomain.

If it's provided we use that in getRssCloudOptions, in place of config.myDomain. 

#### 11/18/23; 12:14:15 PM by DW

At startup set the value of config.mysqlVersion, available to the client app via the pagetable. 

#### 11/11/23; 1:06:07 PM by DW

Respect config.flEnableSupervisorMode.

#### 10/26/23; 10:38:53 AM by DW -- v0.6.7

Reading lists in all their glory!

I had to build a whole new layer in the database. The feeling was we couldn't build newsproducts without having the ability to have subscriptions handled offsite, owned by the user, or by an org that creates such lists. We're starting the first one, called FeedCorps, to prime the pump for the bootstrap. I want to create associations of news flows, I think this is how we create new ecosystems for blogging and journalism.

Most of the new stuff is in feedlanddatabase. 

Also, just had to fix SQL-based notification which went in last month. There was a serious error in the implementation that didn't show up until reading lists came along. See the big comment at the head of notifySocketSubscribersFromSql.

#### 10/12/23; 8:56:07 AM by DW

Support for reading lists.

#### 10/4/23; 12:12:21 PM by DW

We have to call notifySocketSubscribersFromSql even if config.flWebsocketEnabled is false because we're using that mechanism to clear the river cache. So we check config.flWebsocketEnabled where we're sending the message.

#### 10/1/23; 10:34:40 AM by DW -- v0.5.97

Add a callback to notifySocketSubscribersFromSql that's called as we notify user's machines that there's a new item so we can clear the river cache accordingly. Previously we had turned off river caching. I want it back on.

Commented the console.log that emits the id of each new item. 

#### 9/27/23; 6:46:23 PM by DW -- v0.5.96

config.flWriteRssFilesLocally is new, default true. 

if true we write out RSS files to the local hard drive.

set it false obviously if your system doesn't have the ability to write to the local drive.

#### 9/26/23; 12:08:03 PM by DW

New config settings 

* config.flUseSqlForSockets = false and config.minSecsBetwSqlSocketChecks = 5

* config.logMinSecs = 5, config.logMaxResults = 1000

If flUseSqlForSockets, we find out what the new items are by doing an SQL query, and then sending webocket messages to the users we're connected to. If you're running FeedLand in a multi-instance environment, you have to do it this way. All the servers are scanning feeds and receiving rssCloud pings all the time, the only place where all the info is, is in the database. 

In logSqlCalls turned off call to console.trace. Wasn't generating any useful info. 

#### 9/21/23; 6:24:11 PM by DW

Wrote a callback for the new davesql logCallback, we watch for calls that took 5 seconds or more or had 1000 or more results. Obviously these numbers need to be configurable. First I want to get a feel for how it works, and later will add a stack trace, so we can see definitively who's making the call in question. 

#### 9/21/23; 12:04:07 PM by DW

Added feedlandVersion to the pagetable when we build the home page. 

#### 9/20/23; 10:39:13 AM by DW

Static file storage in an SQL table. 

Added new callback facility in daveappserver, we install our callbacks if config.flStaticFilesInSql is true. 

* getStaticFileInSql

* publishStaticFileInSql

#### 9/17/23; 9:18:00 AM by DW

Did more factoring and now newsproducts support is entirely within feedland.js, and all the code is under a single call -- /newsproduct.

If a request comes in for /newsproduct with a <i>username</i> parameter, we render the news product specified by the prefs of the indicated user.

something like https://feedland.org/newsproduct?username=bullmancuso

If a request comes in  for /newsproduct with a <i>template</i> parameter, we get the outline it points to, and set pagetable values accordingly

something like https://feedland.org/newsproduct?template=http://scripting.com/publicfolder/feedland/products/mlbriver.opml

In both cases the client is specified by config.urlNewsProductSource, and for now the default should be fine. 

#### 9/16/23; 9:26:30 AM by DW

Moved the News Product server functionality into FeedLand server.

New setting: config.urlNewsProductSource. The default value should be acceptable for now, so nothing to add to config.json.

If a request comes in for "/newsproduct we render the news product specified by the username parameter

something like http://my.feedland.org/bullmancuso

If a request comes in with a template parameter, we get the outline, and set pagetable values accordingly

something like http://feedland.org/?template=http://scripting.com/publicfolder/feedland/products/mlbriver.opml

The same client app handles both forms of news product. The name of the project is RiverClient, and we should talk about it more. :-)

#### 8/18/23; 12:28:15 PM by DW

Started adding back console.log calls. 

handleRssCloudPing

#### 7/26/23; 2:36:40 PM by DW

Changed the dependencies in package.json to reference specific versions of the packages I authored using the caret, to basically always ask for the newest version available in that major version. 

"daveappserver": "0.6.24",

"davefeedread": "0.5.25",

"davefilesystem": "0.4.5",

"davegithub": "0.5.4",

"davehttp": "0.5.1",

"davemail": "0.5.4",

"daverss": "0.6.2",

"daves3": "0.4.11",

"davesql": "0.4.25",

"davetwitter": "0.6.39",

"daveutils": "0.4.64",

"davezip": "0.4.4",

"feedland": "0.5.60",

"feedlanddatabase": "0.6.14",

"foldertojson": "0.4.7",

"opml": "0.5.1",

"opmltojs": "0.4.12",

"reallysimple": "0.4.24",

#### 7/25/23; 10:57:10 AM by DW

Changed the URL for config.urlStarterFeeds to begin with https:// because the read is flowing through a proxy server.

#### 7/5/23; 9:44:42 AM by DW

Revised what is returned from the /getserverconfig call. 

we need to know the user's blog url, don't need to know the path to the blog folder on the static server. not sure why that was there. 

see comment at head of the routine.

#### 6/14/23; 10:01:47 AM by DW

Added a new POST request to save the users prefs -- "/sendprefs". There was a GET request that did the same and it's still there to prevent breakage with feedlandHome. The new way is supported in the feedlandPlatform code. At some point feedlandHome will be a platform product. 

#### 5/17/23; 4:47:30 PM by DW -- v0.5.40

Fixed a bug where FeedLand would always request rssCloud notifications at feedland.org, even if the software is running on a different server. 

In getRssCloudOptions, we get the domain and port from the appserver-level config.myDomain value. 

#### 5/8/23 by DW

New entrypoint -- /getserverconfig

For apps that are not served by daveappserver.

#### 4/25/23; 4:17:27 PM by DW -- v0.5.30

fixed a bug in blog.js -- if you update an item to remove its title, the title wasn't getting removed in the database

it now works properly.

/getriver is also called to get a river if all we have is the URL of a feed. 

now it works properly in that case

#### 4/25/23; 2:06:28 PM by DW -- v0.5.27

Use the new database.getRiverFromScreenname routine.

See this thread for an explanation of why this was needed. 

https://github.com/scripting/feedlandInstall/issues/31

#### 4/5/23; 11:07:47 AM by DW

In blog.js, if an item already has a link, don't invent one for it. This makes linkblogging work. Previously there was no way to set the link in the user interface.

#### 4/2/23; 5:35:21 PM by DW

Changes in blog.js to support saving of title, link and enclosureUrl from the editor. 

#### 3/29/23; 9:40:08 AM by DW

New setting, config.flNightlyBackup. Default false. 

If true we backup the database at midnight local time. 

I needed this because it seems my database has gotten to large to do this in memory. It appears the feedland.js app crashes every night at midnight. 

This should have always been a config setting, imho.

#### 3/13/23; 10:29:46 AM by DW

Preparing to switch feedland.org over to email identity.

#### 1/22/23; 10:40:58 AM by DW

New config.json setting -- urlStarterFeeds.

Moved emailtemplate.html to the feedlandInstall repo.

#### 1/21/23; 11:24:35 AM by DW

The idea of doing a new build every time there's a new element of config.json isn't going to work well in the future, because of the way we're including every item specially in the pagetable that the home page is rendered through. It would mean we couldn't add code that depends on a value from config.json unless every installation had already upgraded to the new version of the server software. That has been somewhat manageable with two instances, the public one and my test version, but it would be completely out of hand when there are N instances. 

So here's what we're going to do. 

* There will be a new element of the pagetable called config. 

* It will contain a copy of config, selected items.

* I don't want the configuration for the database or github access, but I do want to know how various preferences are set. 

* See getConfigJson in feedland.js to see how it's done.

Prior art: oldschoolblog, look for getConfigJson

https://github.com/scripting/oldSchoolBlog/blob/master/oldschool.js

#### 1/18/23; 11:18:17 AM by DW

This is the NPM package known as "feedland."

Getting ready for the open source release.

daveappserver.js and database.js were being loaded from the lib folder, now we're going to use the NPM packages instead. 

i had them in the lib folder so I didn't need to publish the package each time i had to make a change

but now we're distributing this to user machines, let's use the NPM process for updating as much as possible.

#### 12/7/22; 7:09:38 PM by DW



alter table users add column emailAddress text;

alter table users add column emailSecret text;



#### 11/6/22; 9:27:59 AM by DW

New columns in the users table:

alter table users add column myFeedTitle text;

alter table users add column myFeedDescription text;

#### 10/29/22; 10:42:40 AM by DW

New setting, config.flRenewSubscriptions. I didn't want to screw with the rssCloud options, too deep on other stuff, needed this fixed quickly because my desktop server was renewing subscriptions, and that can never work. It's behind a firewall and can't receive pings.

### 9/23/22 by DW

No longer backup databases when the server app starts. I just want the backup when the day changes. 

### 9/13/22 by DW

Previouslly we were using daveappserver via the lib folder, but it's mature enough to go through NPM, so I changed the require call here. 

### 7/3/22 by DW

Disabled publishFileCallback. See the comment at the head of the routine for details. 

