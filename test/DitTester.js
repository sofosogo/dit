$(function() {

var _img_src = "http://bing.com/s/wlflag.ico";

module("common.dit");
var basic = '<div class="{{class}}_title" jid="${{class}}0{{class}}{{width}}" style="width: {{width}}, height:{{height}}"><div>{{name}} {{name}}</div></div>';
test("create-simple", function(){
    var temp = dit.create( basic );
    var $temp = $(temp);
    temp.fill( {"class": "red", "name":"sofosogo", width: 30, height: 40} );

    ok( $temp.is(".red_title") );
    sameIgnoreCase( $temp.html(), "<div>sofosogo sofosogo</div>" );
    deepEqual( $temp.attr("jid"), "red0red30" );
});

var jquery = '<div><div>name: {{name}}, avatar: ${{img}}, friends: ${{friends}}</div></div>';
test("create-jquery", function(){
    var temp = dit.create( jquery );
    var $temp = $(temp);
    temp.fill( {"name": "sofosogo", "img": $("<img>", {src: _img_src}), friends: $("<span>", {text: "ivy"})} );
    deepEqual( $temp.find("img").attr("src"), _img_src );
    deepEqual( $temp.find("span").html(), "ivy" );
});

var subAttr = '<div><div>name: {{user.name.first}} {{user.name.last}}</div>avatar: ${{user.img}}</div>';
test("create-sub-attr", function(){
    var temp = dit.create( subAttr );
    var $temp = $(temp);
    temp.fill( {user: {"name": {last: "sogo", first: "sofo"}, "img": $("<img>", {src: _img_src}) }} );
    deepEqual( $temp.find("div").html(), "name: sofo sogo" );
    deepEqual( $temp.find("img").attr("src"), _img_src );
});

var bind = '<div bind="user"><div jid="{{first}}{{last}}" bind="name">name: {{first}} {{last}}</div>avatar: ${{img}}</div>';
test("create-bind", function(){
    var temp = dit.create( bind );
    var $temp = $(temp);
    temp.fill( {user: {"name": {last: "sogo", first: "sofo"}, "img": $("<img>", {src: _img_src}) }} );
    deepEqual( $temp.find("div").html(), "name: sofo sogo" );
    deepEqual( $temp.find("img").attr("src"), _img_src );
    deepEqual( $temp.find("div").attr("jid"), "sofosogo" );
});

var array = '<div bind="user">{{0.friends.0}}, {{0.friends.1}}, {{1.friends.0}}, {{1.friends.1}}</div>';
test("create-array", function(){
    var temp = dit.create( array );
    var $temp = $(temp);
    temp.fill( {user: [{friends: ["A", "B"]}, {friends: {"0": "C", "1": "D"}}]} );
    deepEqual( $temp.html(), "A, B, C, D" );
});

test("clean", function(){
    var temp = dit.create( bind );
    var $temp = $(temp);
    temp.fill( {user: {"name": {last: "sogo", first: "sofo"}, "img": $("<img>", {src: _img_src}) }} );
    deepEqual( $temp.find("div").html(), "name: sofo sogo" );
    deepEqual( $temp.find("div").attr("jid"), "sofosogo" );
    temp.fill( {user: {"name": {last: "lee", first: "ivy"}}} );
    deepEqual( $temp.find("div").html(), "name: ivy lee" );
    deepEqual( $temp.find("div").attr("jid"), "ivylee" );
    temp.clean();
    deepEqual( $temp.find("div").html(), "name:  " );
});

var forLoop = 
'<div class=".container">"' +
'    <ol each="u" bind="users">' + 
'        <li jid="{{id}}">' +
'            Name: {{name}}' +
'            <img imgsrc="{{avatar}}"/>' +  
'            Friends: <ol each="f" bind="friends">' +
'                <li class="even" fid="{{.}}">#<a>{{.}}</a>#</li>' + 
'                <li class="odd" fid="{{.}}">#<a>{{.}}</a>#</li>' + 
'                no friend.'+
'            </ol>' + 
'        </li>' +
'    </ol>' + 
'</div>';
test("for loop", function(){
    var temp = dit.create( forLoop );
    var $temp = $(temp);
    var data = {
        users: [{
            id: 1,
            name: "Zhang San",
            avatar: _img_src,
            friends: ["A", "B"]
        },{
            id: 2,
            name: "Li Si",
            avatar: _img_src,
            friends: []
        },{
            id: 3,
            name: "Wang Wu",
            avatar: _img_src,
            friends: ["C"]
        }]
    };
    temp.fill( data );
    //console.log( $temp.html() );
    deepEqual( $temp.find("li[jid]").length, 3);
    deepEqual( $temp.find("li[fid]").length, 3);
    deepEqual( $temp.find("li[class=even]").length, 2);
    deepEqual( $temp.find("li[class=odd]").length, 1);
    
    var loop = '<ol each="arch" bind="archievements"></ol>';
    temp = dit.create( loop, {
        archievements: function( archs, data ){
            var fragment = document.createDocumentFragment();
            for( var i = 0; i < archs.length; i++ ){
                fragment.appendChild( $("<li>", {"text": archs[i], "class": i % 2 ? "odd" : "even" })[0] );
            }
            if( archs.length === 0 ) fragment.appendChild( $("<div>", {"text": "No Archievement."})[0] );
            return fragment;
        }
    });
    temp.fill( {archievements: ["A", "B", "C"]} );
    deepEqual( 3, temp.childNodes.length );
    temp.fill( {archievements: []} );
    deepEqual( 1, temp.childNodes.length );
});

test("clone", function(){
    var temp = dit.create("<div><div>{{name}} name</div></div>");
    var clone = temp.clone();
    temp.fill( {name: "temp"} );
    clone.fill( {name: "clone"} );
    sameIgnoreCase("<div>temp name</div>", temp.innerHTML);
    sameIgnoreCase("<div>clone name</div>", clone.innerHTML);
});

test("opt", function(){
    var genders = { "m": "男", "f": "女" };
    var user = { "lastName": "张", "firstName": "三", "gender": "m", "age": 26 };
    var string = "<div><div>{{labelName}}：{{name}}</div><div>{{labelGender}}：{{gender}}</div><div>年龄：{{age}}</div></div>";
    var temp = dit.create(string, {
        "gender": function( val ){
            return genders[val] || "未知";
        },
        "name": function( val, user ){
            return user.lastName + user.firstName;
        },
        "labelGender": "性别",
        "labelName": "姓名"
    });
    temp.fill( user );
    sameIgnoreCase( temp.innerHTML.replace(/\s*/g, ""), "<div>姓名：张三</div><div>性别：男</div><div>年龄：26</div>" );
});


module("common.Form");
test("create-form", function(){
	stop();
    $.get("form-sample.html", function( html ){
        var user = { 
            name: "sofosogo",
            gender: 0,
            age: 24,
            desc:"SE",
            details:{
                language: ["English", "Chinese"],
                school: "HFUT",
                sports: ["Basketball", "PingPong"]
            },
            confirmed: 1
        };
        
        var temp = dit.create( html );
        temp.fill( user );
        var fetched = temp.fetch();
        if( window.console && window.JSON ){
        	console.log( JSON.stringify(fetched) );
        }
        deepEqual( fetched.name, "sofosogo" );
        deepEqual( fetched.gender, 0 );
        deepEqual( fetched.age, 24 );
        deepEqual( fetched.desc, "SE" );
        deepEqual( fetched.details.language.length, 2 );
        deepEqual( fetched.details.school, "HFUT" );
        deepEqual( fetched.details.sports.length, 2 );
        deepEqual( fetched.confirmed, 1 );
        
        fetched = temp.clean().fetch();
        deepEqual( fetched.name, "" );
        deepEqual( fetched.gender, void 0 );
        deepEqual( fetched.age, void 0 );
        deepEqual( fetched.desc, "" );
        deepEqual( fetched.details.language.length, 0 );
        deepEqual( fetched.details.gender, void 0 );
        deepEqual( fetched.details.school, "" );
        deepEqual( fetched.details.sports.length, 0 );
        deepEqual( fetched.confirmed, void 0 );
        
        start();
    }, "text");
});

function sameIgnoreCase( str1, str2 ){
    return deepEqual( str1.toLowerCase(), str2.toLowerCase() );
}

});