/*
This file is part of RPGsheets.

RPGsheets is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

RPGsheets is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with RPGsheets.  If not, see <http://www.gnu.org/licenses/>.
*/

var http = require('http');
var url = require('url');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var router = require('./router.js');

var globalDB;

var insertDocument = function(collection,data, callback) {
	globalDB.collection(collection).insertOne( data, function(err, results) {
		callback(err,results);
	});
};

var queryDocument = function(collection, query, callback) {
	globalDB.collection(collection).find(query).toArray(function(err,docs){
		callback(err, docs);
	});
};

var removeDocument = function(collection, query, callback) {
	globalDB.collection(collection).deleteOne(query, function(err, results) {
		callback(err,results);
	});
};

var updateDocument = function(collection, query, data, callback) {
	globalDB.collection(collection).updateOne(query,
		{
			$set: data,
			$currentDate: { "lastModified": true }
		}, function(err, results) {
		callback(err,results);
	});
};

var updateDocuments = function(collection, query, data, callback) {
   globalDB.collection(collection).updateMany(query,
      {
        $set: data,
        $currentDate: { "lastModified": true }
      }
      ,
      function(err, results) {
        callback(err,results);
   });
};

var RoutePublic = function(request, response, data, PageHandler) {
	var requestUrl = url.parse(request.url,true);
	var pathname = requestUrl.pathname;
	var imageUrlRegx = /.png/g;
	var cssUrlRegx = /.css/g;
	var jsUrlRegx = /.js/g;
	if(imageUrlRegx.test(pathname)) {
		response.setHeader('Content-Type', 'image/png');
	} else if(imageUrlRegx.test(pathname)) {
		response.setHeader('Content-Type', 'text/css');
	} else if(imageUrlRegx.test(pathname)) {
		response.setHeader('Content-Type', 'application/javascript');
	} else {
		response.setHeader('Content-Type', 'text/html');
	}

	var filePath = "."+pathname;
	PageHandler(200,response,filePath);
};

var RouteIndex = function(request,response,data,PageHandler) {
	response.setHeader('Content-Type', 'text/html');
	var filePath = "./index.html";
	queryDocument("worlds",{} ,(err, docs)=>{
		if(!err){
			PageHandler(200,response,filePath);	
		} else {
			PageHandler(404,response);
		}
	});
};

var RouteWorld = function(request,response,data,PageHandler) {
	var requestUrl = url.parse(request.url,true);
	response.setHeader('Content-Type', 'text/html');
	var urlParts = requestUrl.pathname.split(path.sep);

	var worldName = urlParts[1];

	var filePath = "./world.html";

	var world;
	var classes;
	var races;

	var erro = false;
	var proceed = true;
	var serverAccess = 0;
	const nOfServerAccess = 3;
	var sendResponse = false;

	globalDB.collection('worlds').findOne({"name":worldName},{"_id":true,"name": true},function(err,worldDoc){
		if(!err) {
			if(worldDoc) {
				world = worldDoc;
				serverAccess++;
				if(serverAccess == nOfServerAccess) {
					sendResponse = true;
				}
			} else proceed = false;
		} else erro = true;
	});

	globalDB.collection('races').find({}).toArray((err,raceDocs)=>{
		if(!err) {
			races = raceDocs;
			serverAccess++;
			if(serverAccess == nOfServerAccess) {
				sendResponse = true;
			}
		} else erro = true;
	});

	globalDB.collection('classes').find({}).toArray((err,classDocs)=>{
		if(!err) {
			classes = classDocs;
			serverAccess++;
			if(serverAccess == nOfServerAccess) {
				sendResponse = true;
			}
		} else erro = true;
	});

	var timerHandle = setInterval(()=>{
		if(erro) {
			PageHandler(500,response);
			clearInterval(timerHandle);
		} else if(!proceed) {
			PageHandler(404,response);
			clearInterval(timerHandle);
		} else if (sendResponse) {
			PageHandler(200,response,filePath,(page)=>{
				var pageWorld = page.replace(/<SERVER_REPLACE_WORLD>/g,JSON.stringify(world));
				var pageWithRaces = pageWorld.replace(/<SERVER_REPLACE_RACES>/g,JSON.stringify(races));
				var pageWithClasses = pageWithRaces.replace(/<SERVER_REPLACE_CLASSES>/g,JSON.stringify(classes));
				return pageWithClasses;
			});
			clearInterval(timerHandle);
		}
	},10);

};

var RoutePlayer = function(request,response,data,PageHandler) {
	var requestUrl = url.parse(request.url,true);
	response.setHeader('Content-Type', 'text/html');
	var urlParts = requestUrl.pathname.split(path.sep);

	var worldName = urlParts[1];
	var playerName = urlParts[2];

	var world;
	var player;
	var pRace;
	var pClass;
	var classes;
	var races;
	var erro = false;
	var proceed = true;
	var serverAccess = 0;
	const nOfServerAccess = 6;
	var sendResponse = false;

	var filePath = "./player.html";

	globalDB.collection("worlds").findOne({"name":worldName},{"name":true},(err,worldDoc)=>{
		if(!err) {
			if(worldDoc) {
				world = worldDoc;
				serverAccess++;
				if(serverAccess == nOfServerAccess) {
					sendResponse = true;
				}
			} else proceed = false;
		} else erro = true;
	});

	globalDB.collection("players").findOne({"name":playerName,"worldName":worldName},(err,playerDoc)=>{
		if(!err) {
			if(playerDoc) {
				player = playerDoc;
				serverAccess++;
				if(serverAccess == nOfServerAccess) {
					sendResponse = true;
				}
				globalDB.collection('races').findOne({"name":player.raceName},(err,raceDoc)=>{
					if(!err) {
						pRace = raceDoc;
						serverAccess++;
						if(serverAccess == nOfServerAccess) {
							sendResponse = true;
						}
					} else erro = true;
				});

				globalDB.collection('classes').findOne({"name":player.className},(err,classDoc)=>{
					if(!err) {
						pClass = classDoc;
						serverAccess++;
						if(serverAccess == nOfServerAccess) {
							sendResponse = true;
						}
					} else erro = true;
				});
			} else proceed = false;
		} else erro = true;
	});

	globalDB.collection('races').find({}).toArray((err,raceDocs)=>{
		if(!err) {
			races = raceDocs;
			serverAccess++;
			if(serverAccess == nOfServerAccess) {
				sendResponse = true;
			}
		} else erro = true;
	});

	globalDB.collection('classes').find({}).toArray((err,classDocs)=>{
		if(!err) {
			classes = classDocs;
			serverAccess++;
			if(serverAccess == nOfServerAccess) {
				sendResponse = true;
			}
		} else erro = true;
	});

	var timerHandle = setInterval(()=>{
		if(erro) {
			PageHandler(500,response);
			clearInterval(timerHandle);
		} else if(!proceed) {
			PageHandler(404,response);
			clearInterval(timerHandle);
		} else if (sendResponse) {
			PageHandler(200,response,filePath,(page)=>{
				player.class = pClass;
				player.race = pRace;
				return page.replace(/<SERVER_REPLACE_PLAYER>/g,JSON.stringify(player)).replace(/<SERVER_REPLACE_CLASSES>/g,JSON.stringify(classes)).replace(/<SERVER_REPLACE_RACES>/g,JSON.stringify(races));
			});
			clearInterval(timerHandle);
		}
	},10);
};

var RouteApiWorld = function(request, response, data, PageHandler) {
	collection = "worlds";
	response.setHeader('Content-Type', 'application/json');
	var requestUrl = url.parse(request.url,true);
	switch(request.method) {
		case 'GET':
			queryDocument(collection,requestUrl.query ,(err,getDocs)=>{
														response.statusCode = 200;
														response.end(JSON.stringify(getDocs));
													});
		break;
		case 'POST':
			insertDocument(collection,data.post,(err,postResults)=>{
													response.statusCode = 201;
													response.end(JSON.stringify(postResults));
												});
		break;
		case 'DELETE':
			console.log(data);
			removeDocument(collection,data.query, (err,deleteResults) =>{
				response.statusCode = 200;
				response.end(JSON.stringify(deleteResults));
			});
		break;
		case 'PATCH':
			updateDocument(collection,data.query,data.post,(err,worldUpdateResults) =>{
				updateDocuments("players",{"worldName":data.query.name},{"worldName":data.post.name},(err,playerUpdateResults) =>{
					response.statusCode = 200;
					var updateResults = [];
					updateResults.push(worldUpdateResults);
					updateResults.push(playerUpdateResults);
					response.end(JSON.stringify(updateResults));
				});
			});
			
		break;
	};
};

var RouteApiPlayer = function(request, response, data, PageHandler) {
	collection = "players";
	response.setHeader('Content-Type', 'application/json');
	var requestUrl = url.parse(request.url,true);
	switch(request.method) {
		case 'GET':
			queryDocument(collection,requestUrl.query ,(err,getDocs)=>{
														response.statusCode = 200;
														response.end(JSON.stringify(getDocs));
													});
		break;
		case 'POST':
			insertDocument(collection,data.post,(err,postResults)=>{
													response.statusCode = 201;
													response.end(JSON.stringify(postResults));
												});
		break;
		case 'DELETE':
			console.log(data);
			removeDocument(collection,data.query, (err,deleteResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(deleteResults));
														});
		break;
		case 'PATCH':
			updateDocument(collection,data.query,data.post,(err,updateResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(updateResults));
														});
		break;
	};
};

var RouteApiFeature = function(request, response, data, PageHandler) {
	collection = "features";
	response.setHeader('Content-Type', 'application/json');
	var requestUrl = url.parse(request.url,true);
	switch(request.method) {
		case 'GET':
			queryDocument(collection,requestUrl.query ,(err,getDocs)=>{
														response.statusCode = 200;
														response.end(JSON.stringify(getDocs));
													});
		break;
		case 'POST':
			insertDocument(collection,data.post,(err,postResults)=>{
													response.statusCode = 201;
													response.end(JSON.stringify(postResults));
												});
		break;
		case 'DELETE':
			console.log(data);
			removeDocument(collection,data.query, (err,deleteResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(deleteResults));
														});
		break;
		case 'PATCH':
			updateDocument(collection,data.query,data.post,(err,updateResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(updateResults));
														});
		break;
	};
};

var RouteApiClass = function(request, response, data, PageHandler) {
	collection = "classes";
	response.setHeader('Content-Type', 'application/json');
	var requestUrl = url.parse(request.url,true);
	switch(request.method) {
		case 'GET':
			queryDocument(collection,requestUrl.query ,(err,getDocs)=>{
														response.statusCode = 200;
														response.end(JSON.stringify(getDocs));
													});
		break;
		case 'POST':
			insertDocument(collection,data.post,(err,postResults)=>{
													response.statusCode = 201;
													response.end(JSON.stringify(postResults));
												});
		break;
		case 'DELETE':
			console.log(data);
			removeDocument(collection,data.query, (err,deleteResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(deleteResults));
														});
		break;
		case 'PATCH':
			updateDocument(collection,data.query,data.post,(err,updateResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(updateResults));
														});
		break;
	};
};

var RouteApiRace = function(request, response, data, PageHandler) {
	collection = "races";
	response.setHeader('Content-Type', 'application/json');
	var requestUrl = url.parse(request.url,true);
	switch(request.method) {
		case 'GET':
			queryDocument(collection,requestUrl.query ,(err,getDocs)=>{
														response.statusCode = 200;
														response.end(JSON.stringify(getDocs));
													});
		break;
		case 'POST':
			insertDocument(collection,data.post,(err,postResults)=>{
													response.statusCode = 201;
													response.end(JSON.stringify(postResults));
												});
		break;
		case 'DELETE':
			console.log(data);
			removeDocument(collection,data.query, (err,deleteResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(deleteResults));
														});
		break;
		case 'PATCH':
			updateDocument(collection,data.query,data.post,(err,updateResults) =>{
															response.statusCode = 200;
															response.end(JSON.stringify(updateResults));
														});
		break;
	};
};

var urlMongodb = 'mongodb://localhost:27017/rpgsheets';
MongoClient.connect(urlMongodb, function(err, db) {
	assert.equal(null, err);
	console.log("Connected correctly to database.");
	globalDB = db;
});

var server = http.createServer(router.RequestHandler);

router.add(/^\/$/,RouteIndex);
router.add(/^\/\w+$/,RouteWorld);
router.add(/^\/(?!(api))\w+\/\w+$/,RoutePlayer);
router.add(/^\/api\/feature$/,RouteApiFeature);
router.add(/^\/api\/world$/,RouteApiWorld);
router.add(/^\/api\/player$/,RouteApiPlayer);
router.add(/^\/api\/class$/,RouteApiClass);
router.add(/^\/api\/race$/,RouteApiRace);
router.add(/^\/public\/[(\--z)]+(.png|.css|.js|.html)$/,RoutePublic);

server.listen(8080);
