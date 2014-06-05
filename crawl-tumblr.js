var url = "http://api.tumblr.com/v2/blog/moron4hire.tumblr.com/posts/text?api_key=fuiKNFp9vQFvjLNvx4sUwti4Yb5yGutBN4Xh10LXZhhRKjWlV4&offset=";

function get(off){ var x = new XMLHttpRequest(); 
x.open("GET", url+off, false);
x.send();
var obj = JSON.parse(x.responseText);
if(obj && obj.meta && obj.meta.msg == "OK" && obj.meta.status == 200 && obj.response)
return obj.response.posts;
return null;}

function crawl(n){
var posts = []; 
for(var i = n; i <= 466;){ 
console.log(i);
var newPosts = get(i); 
i += newPosts.length;
posts = posts.concat(newPosts);
if(newPosts.length == 0) break;}
return posts;}

var posts = crawl(0);
posts.reverse();
document.body.innerHTML = "";
posts.forEach(function(p){
var a = document.createElement("article");
var b = document.createElement("h1");
var c = document.createElement("hr");
b.textContent = p.title;
a.appendChild(b);
a.innerHTML += p.body;
a.appendChild(c);
document.body.appendChild(a);});