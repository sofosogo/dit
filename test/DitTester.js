$(document).ready(function() {

var _img_src = "http://bing.com/s/wlflag.ico";

module("common.Dit");
var basic = '<div class="{class}_title" jid="${class}0{class}{width}" style="width: {width}, height:{height}"><div>{name} {name}</div></div>';
test("create-simple", function(){
    var temp = Dit.create( basic );
    var $temp = $(temp);
    temp.fill( {"class": "red", "name":"sofosogo", width: 30, height: 40} );

    ok( $temp.is(".red_title") );
    sameIgnoreCase( $temp.html(), "<div>sofosogo sofosogo</div>" );
    same( $temp.attr("jid"), "red0red30" );
});

var jquery = '<div><div>name: {name}, avatar: ${img}, friends: ${friends}</div></div>';
test("create-jquery", function(){
    var temp = Dit.create( jquery );
    var $temp = $(temp);
    temp.fill( {"name": "sofosogo", "img": $("<img>", {src: _img_src}), friends: $("<span>", {text: "ivy"})} );
    same( $temp.find("img").attr("src"), _img_src );
    same( $temp.find("span").html(), "ivy" );
    sameIgnoreCase( $temp.html(), '<div>name: sofosogo, avatar: <img src="http://bing.com/s/wlflag.ico">, friends: <span>ivy</span></div>' );
});

var subAttr = '<div><div>name: {user.name.first} {user.name.last}</div>avatar: ${user.img}</div>';
test("create-sub-attr", function(){
    var temp = Dit.create( subAttr );
    var $temp = $(temp);
    temp.fill( {user: {"name": {last: "sogo", first: "sofo"}, "img": $("<img>", {src: _img_src}) }} );
    same( $temp.find("div").html(), "name: sofo sogo" );
    same( $temp.find("img").attr("src"), _img_src );
});

var bind = '<div bind="user"><div jid="{first}{last}" bind="name">name: {first} {last}</div>avatar: ${img}</div>';
test("create-bind", function(){
    var temp = Dit.create( bind );
    var $temp = $(temp);
    temp.fill( {user: {"name": {last: "sogo", first: "sofo"}, "img": $("<img>", {src: _img_src}) }} );
    same( $temp.find("div").html(), "name: sofo sogo" );
    same( $temp.find("img").attr("src"), _img_src );
    same( $temp.find("div").attr("jid"), "sofosogo" );
    sameIgnoreCase( $temp.html(), '<div jid="sofosogo">name: sofo sogo</div>avatar: <img src="http://bing.com/s/wlflag.ico">' );
});

var array = '<div bind="user">{0.friends.0}, {0.friends.1}, {1.friends.0}, {1.friends.1}</div>';
test("create-array", function(){
    var temp = Dit.create( array );
    var $temp = $(temp);
    temp.fill( {user: [{friends: ["A", "B"]}, {friends: {"0": "C", "1": "D"}}]} );
    same( $temp.html(), "A, B, C, D" );
});

test("clean", function(){
    var temp = Dit.create( bind );
    var $temp = $(temp);
    temp.fill( {user: {"name": {last: "sogo", first: "sofo"}, "img": $("<img>", {src: _img_src}) }} );
    same( $temp.find("div").html(), "name: sofo sogo" );
    same( $temp.find("div").attr("jid"), "sofosogo" );
    temp.fill( {user: {"name": {last: "lee", first: "ivy"}}} );
    same( $temp.find("div").html(), "name: ivy lee" );
    same( $temp.find("div").attr("jid"), "ivylee" );
    temp.clean();
    same( $temp.find("div").html(), "name:  " );
});

var forLoop = 
'<div class=".container">"' +
'    <ol each="u" bind="users">' + 
'        <li jid="{id}">' +
'            Name: {name}' +
'            <img src="{avatar}"/>' +  
'            Friends: <ol each="f" bind="friends">' +
'                <li class="even" fid="{.}">#<a>{.}</a>#</li>' + 
'                <li class="odd" fid="{.}">#<a>{.}</a>#</li>' + 
'                no friend.'+
'            </ol>' + 
'        </li>' +
'    </ol>' + 
'</div>';
test("for loop", function(){
    var temp = Dit.create( forLoop );
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
    same( $temp.find("li[jid]").length, 3);
    same( $temp.find("li[fid]").length, 3);
    same( $temp.find("li[class=even]").length, 2);
    same( $temp.find("li[class=odd]").length, 1);
    
    var loop = '<ol each="arch" bind="archievements"></ol>';
    temp = Dit.create( loop, {
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
    same( 3, temp.childNodes.length );
    temp.fill( {archievements: []} );
    same( 1, temp.childNodes.length );
});

test("clone", function(){
    var temp = Dit.create("<div><div>{name}</div></div>");
    var clone = temp.clone();
    temp.fill( {name: "temp"} );
    clone.fill( {name: "clone"} );
    sameIgnoreCase("<div>temp</div>", temp.innerHTML);
    sameIgnoreCase("<div>clone</div>", clone.innerHTML);
});

test("opt", function(){
    var genders = { "m": "男", "f": "女" };
    var user = { "lastName": "张", "firstName": "三", "gender": "m", "age": 26 };
    var string = "<div><div>{labelName}：{name}</div><div>{labelGender}：{gender}</div><div>年龄：{age}</div></div>";
    var temp = Dit.create(string, {
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
        
        var temp = Dit.create( html );
        temp.fill( user );
        var fetched = temp.fetch();
        same( fetched.name, "sofosogo" );
        same( fetched.gender, 0 );
        same( fetched.age, 24 );
        same( fetched.desc, "SE" );
        same( fetched.details.language.length, 2 );
        same( fetched.details.school, "HFUT" );
        same( fetched.details.sports.length, 2 );
        same( fetched.confirmed, 1 );
        
        fetched = temp.clean().fetch();
        same( fetched.name, "" );
        same( fetched.gender, void 0 );
        same( fetched.age, void 0 );
        same( fetched.desc, "" );
        same( fetched.details.language.length, 0 );
        same( fetched.details.gender, void 0 );
        same( fetched.details.school, "" );
        same( fetched.details.sports.length, 0 );
        same( fetched.confirmed, void 0 );
        
        start();
    }, "text");
    
    stop();
});

function sameIgnoreCase( str1, str2 ){
    return same( str1.toLowerCase(), str2.toLowerCase() );
}

});