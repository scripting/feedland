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

