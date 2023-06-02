var myProductName = "feedlandutils"; myVersion = "0.4.0";      

const fs = require ("fs");
const utils = require ("daveutils"); 
const request = require ("request");
const davesql = require ("davesql"); //9/25/22 by DW
const database = require ("feedlanddatabase"); 

fs.readFile ("config.json", function (err, jsontext) {
	if (err) {
		console.log (err.message);
		}
	else {
		config = JSON.parse (jsontext);
		console.log ("config == " + utils.jsonStringify (config));
		davesql.start (config.database, function () {
			database.start (config, function () { 
				
				//Call your utilities here -- 10/14/22 by DW
				
				});
			});
		}
	});

