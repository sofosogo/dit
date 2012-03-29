**﻿Dit，一个简单的模板引擎，根据已经存在的DOM节点，或者是任何合法的HTML字符串就可以构造出一个模板，仅仅是在需要的地方（文本节点或者属性）中引入{{}}或者${{}}，所以有着较低的侵入性。**  
# API：  
**Template.create( node, opt )**  
@param node: （符合HTML语法的）字符串/DOM节点，必选。  
@param opt: 对象，可选。比如{ thisp: XXObj, enable: "enable-msg", once: true } 所有可选参数。  
&nbsp;&nbsp;&nbsp;&nbsp;可以给某些占位符指定固定的值或者特殊的处理函数，用法详见Q && A部分。  
@return template，拥有某些特殊方法（fill，clean，clone）的DOM节点。  

**template.fill( data )**  
填充数据。  
@param data 对象，必填。如 data = {"user": { "name": "sofosogo" }} 将会使用"sofosogo"代替占位符 {user.name}。  
@return template，返回自身。 
  
**template.clean()**  
将所有占位符节点或属性去掉，文字清空。  
@return template，返回自身。 
  
**template.clone()**  
@return template，克隆一个同样的模板。  
**注意：本质上就是创建一个新的模板，填充的数值并不会被克隆。**  

# Q && A
1. Q：在创建模板的时候，怎样使用第二个参数（opt）？  
A： 如果占位符的值是固定的，在模板创建以后就不会再改变，并且在调用fill方法时，不需要再次填充该值。比如在国际化过程中，label值仅仅跟语言有关，此时可以使用{genderLabel: "Gender"}来设置此label值。  
如果填充的值需要经过某种处理才能适应当前页面，比如填充的数据中gender的值是"m"，"f"（此数据直接来自数据库），但是页面需要显示的是"Male"，"Femal"。此时设置opt对象  
{   
&nbsp;&nbsp;&nbsp;&nbsp;gender: function( gender, data ){  
&nbsp;&nbsp;&nbsp;&nbsp;	return gender === "m" : "Male" : ( gender === "f" ? "Femal" : "" );  
&nbsp;&nbsp;&nbsp;&nbsp;}  
}  

2. Q：如何编写合适的html文本？  
A：当前，**Dit占用两个自定义节点属性，bind和each。**  
**bind**主要是为了书写方便。适合数据层次较深，数据和视图结构上比较匹配的情况。如以下两种写法是等价的。  
"&lt;div bind="user"&gt;&lt;div jid="{{first}}{{last}}" bind="name"&gt;name: {{first}} {{last}}&lt;/div&gt;"  
"&lt;div&gt;&lt;div jid="{{user.name.first}}{{user.name.last}}"&gt;name: {{user.name.first}} {{user.name.last}}&lt;/div&gt;"  
**each**是为了显示一个数组数据，通常和bind一起使用。比如在玩家成就面板上显示所有的玩家所有的成就。  
拥有each属性的节点包含若干个子节点模板，假设个数为M，如果M&gt;=2，则最后一个子模板是数组长度为0时，所显示的节点。其他子节点模板则是用于数组长度不为0时，按顺序依次循环显示每个数组元素。如：  
&lt;div each="achievement" bind="user.achievements"&gt;  
&nbsp;&nbsp;&nbsp;&nbsp;&lt;li class="even"&gt;{{.}}&lt;/li&gt;  
&nbsp;&nbsp;&nbsp;&nbsp;&lt;li class="odd"&gt;{{.}}&lt;/li&gt;  
&nbsp;&nbsp;&nbsp;&nbsp;&lt;div&gt;No Achievement.&lt;/div&gt;  
&lt;div&gt;  
如果M=1，则所有的数组元素都用这一种模板显示。  
以上是each的默认行为，可以在创建模板时使用opt指定特殊实现。如：  
archievements: function( archs, data ){  
&nbsp;&nbsp;&nbsp;&nbsp;var fragment = document.createDocumentFragment();  
&nbsp;&nbsp;&nbsp;&nbsp;for( var i = 0; i < archs.length; i++ ){  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;fragment.appendChild( $("&lt;li&gt;", {"text": archs[i], "class": i % 2 ? "odd" : "even" })[0] );  
&nbsp;&nbsp;&nbsp;&nbsp;}  
&nbsp;&nbsp;&nbsp;&nbsp;if( archs.length === 0 ) fragment.appendChild( $("&lt;div&gt;", {"text": "No Archievement."})[0] );  
&nbsp;&nbsp;&nbsp;&nbsp;return fragment;  
}  
**支持{}和${}两种占位符格式**，其中，如果后者用于文本节点中，则可以作为DOM节点（jquery也可以）的占位符。如以下所示：  
&lt;div&gt;Avatar: ${{img}}&lt;/div&gt;  ---&gt;fill( {img: $("&lt;img&gt;")} ) ---&gt; &lt;div&gt;Avatar: &lt;img&gt;&lt;/div&gt;