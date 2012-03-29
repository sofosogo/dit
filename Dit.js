(function(){
var dit = window.dit = {
    create: function( node, opt ){
        node = parseNode( node );
        node._opt = opt;
        node._holders = {};
        node._fields = {};
        scan( node, opt, node._holders, node._fields, [] );
        for( var k in this.proto ){
            node[k] = this.proto[k];
        }
        return node;
    },
    proto: {
        fill: function( data, append ){
            hide( this );
            fill( this._holders, this._fields, data || {}, this._opt, append );
            return show( this );
        },
        append: function( data ){
            return this.fill( data, true );
        },
        clean: function(){
            hide( this );
            clean( this._holders );
            return show( this );
        },
        /* clone is not working in IE9 now.*/
        clone: function(){
            return this._html ? dit.create(this._html, this._opt) : null;
        },
        fetch: function(){
            return fetch( this._fields );
        },
        opt: function( k, v ){
            opt( this._opt, k, v );
            return this;
        }
    }
},
    alias = {
        // imgsrc -> src, using imgsrc to avoid an error request.
        "imgsrc": "src"
    },
    protos = {},
    toString = Object.prototype.toString,
    join = Array.prototype.join,
    container = document.createElement("body"),
    regex = /(\$?)\{\{\s*([\w\d\.]+)\s*:?\s*([^}]*)\}\}/ig;

function parseNode( node ){
	var _n = node;
    if( typeof node === "string" ){
        container.innerHTML = node;
        _n = container.firstChild;
        _n._html = node;
    }else if( node.jquery ){
        _n = node[0];
    }
    if( _n && !_n._html ){
    	_n._html = _n.outerHTML;
    }
    return _n;
}

function fill( phs, fields, data, opt, append ){
    var val, handlers;
    for( var field in phs ){
        val = evaluate( data, field );
        if( opt && opt[field] !== void 0 ){
            val = typeof opt[field] === "function" ? opt[field]( val, data ) : opt[field];
        }
        if( val === void 0 && append ) continue;
        if( val === void 0 || val === null ) val = "";
        // below is incorrect, because user action won't change phs[field].val.
        // OR phs[field].val is a pointer;
        // if( val === phs[field].val ) continue;
        phs[field].val = val;
        handlers = phs[field].handlers;
        for( var i = 0; i < handlers.length; i++ ){
            handlers[i].fill( val );
        }
    }
}

function clean( phs ){
    var handlers;
    for( var field in phs ){
        handlers = phs[field].handlers;
        phs[field].val = null;
        for( var i = 0; i < handlers.length; i++ ){
            handlers[i].clean();
        }
    }
}

function opt(opt, k, v ){
    if( !k ) return ;
    if( typeof k === "string" )
        return opt[k] = v;
    for( var i in k )
        opt[i] = k[i];
}

function fetch( fields ){
    var data = {};
    for( var k in fields ){
        assemble( data, k, fields[k].fetch() );
    }
    return data;
}

function scan( node, opt, phs, fields, prefix ){
    if( node.nodeType === 3 ) return scanText( node, phs, prefix );
    if( node.nodeType !== 1 ) return ;
    if( node.getAttribute("bind") ){
        prefix = prefix.concat( node.getAttribute("bind") );
        node.removeAttribute("bind");
    }
    scanAttr( node, phs, prefix );
    isFormField( node ) && scanFormField( node, phs, fields, prefix );
    if( node.getAttribute("each") ){
        var children = [];
        while( node.hasChildNodes() ){
            var child = node.removeChild(node.firstChild);
            if (child.nodeType === 3 && /^\s*$/.test(child.nodeValue)) continue;
            children.push(child);
        }
        var empty = children.length > 2 ? children.pop() : textNode("");
        var handler = {
            fill: function( arr ){
                this.clean();
                if( arr.jquery ) arr = arr[0];
                if( arr.nodeType === 11 ) return this.node.appendChild(arr);
                if( !arr || arr.length === 0 ) return this.node.appendChild(empty);
                var num = children.length, 
                    t;
                for( var i = 0, j = 0; i < arr.length; i++ ){
                    t = children[i % num].cloneNode(true);
                    t = dit.create(t, opt).fill(arr[i]);
                    this.node.appendChild( t );
                }
            },
            clean: function(){
                this.node.innerHTML = "";
            },
            node: node
        };
        getHandlers(phs, prefix).push( handler );
        return;
    }
    // node.childNodes changed by scanText function.
    var children = []; 
    for( var i = 0; i < node.childNodes.length; i++ ){
        children.push( node.childNodes[i] );
    }
    var child;
    for( var i = 0; i < children.length; i++ ){
        child = children[i];
        if( child.nodeType === 1 ){
            scan( child, opt, phs, fields, prefix );
        }else if( child.nodeType === 3 ){
            scanText( child, phs, prefix );
        }
    }
}

function scanAttr( node, phs, prefix ){
    var attrs = node.attributes;
    for( var i = 0; i < attrs.length; i++ ) {
        var _ori = attrs[i].nodeValue, 
            _phs = [];
        if( !_ori || attrs[i].name === "_html" || typeof _ori !== "string" ) continue;
        _ori.replace(regex, function( match, has$, field, exp, startIdx ){
            field = getField( prefix, field );
            var ph = {f: field, m: match},
                attr = attrs[i].nodeName,
                attr = alias[attr] ? alias[attr] : attr,
                handler = {
                fill: function( v ){
                    var val = this._ori, ph, _tm;
                    for( var i = 0; i < this._phs.length; i++){
                        ph = this._phs[i];
                        _tm = phs[ph.f].val;
                        if( ph.convert )
                            _tm = ph.convert( _tm );
                        val = val.replace( ph.m, _tm );
                    }
                    attr === "class" ? node.className = val : node.setAttribute(attr, val);
                },
                clean: function(){
                    var val = this._ori.replace(regex, "");
                    attr === "class" ? node.className = val : node.setAttribute(attr, val);
                },
                _ori: _ori,
                _phs: _phs
            };
            if( exp ) 
                ph.convert = convert( field, exp );
            _phs.push( ph );
            getHandlers(phs, null, field).push( handler );
        });
        _phs = null;
    }
}

function scanText( node, phs, prefix ){
    var parent = node.parentNode;
    var value = node.nodeValue;
    var txt, idx = 0;
    node.nodeValue.replace(regex, function( match, has$, field, exp, startIdx ){
        if( txt = value.substring(idx, startIdx) ) parent.insertBefore( textNode(txt), node );
        var dn = textNode( match );
        var handler = {
            fill: function( val ){
                if( this.convert ) val = this.convert(val);
                if( val.jquery ){
                    val = $.map(val.toArray(), function(it){return it;});
                };
                if( val.nodeType !== 1 && !isArray(val) || !has$ ) val = textNode( val );
                var now = this._now;
                if( isArray(now) ){
                    for( var i = 1; i < now.length; i++){
                        parent.removeChild( now[i] );
                    }
                    now = now[0];
                }
                if( isArray(val) ){
                    for( var i = 0; i < val.length; i++){
                        parent.insertBefore( val[i], now );
                    }
                }else if(val){
                    parent.insertBefore( val, now );
                }
                parent.removeChild( now );
                this._now = val;
            },
            clean: function(){
                var now = this._now;
                if( isArray(now) ){
                    for( var i = 1; i < now.length; i++){
                        parent.removeChild( now[i] );
                    }
                    now = now[0];
                }
                parent.replaceChild( this._empty, now );
                this._now = this._empty;
            },
            _ori: dn,
            _now: dn,
            _empty: textNode("")
        };
        if( exp ) handler.convert = convert( field, exp );
        getHandlers( phs, prefix, field ).push( handler );
        parent.insertBefore( dn, node );
        idx = startIdx + match.length;
    });
    if( txt = value.substring(idx) ) parent.insertBefore( textNode(txt), node );
    parent.removeChild( node );
}

function scanFormField( node, phs, fields, prefix ){
    var name = node.name,
        // type = node.getAttribute("type"),
        type = node.type,
        isNum = node.getAttribute("number"),
        key = getField( prefix, name ),
        handler = fields[key];
    // console.log(name + ': node.type = ' + node.type + ', node.getAttribute("type") = ' + node.getAttribute("type"))
    if( !handler ){
         handler = fields[key] = new (protos[type] || protos.normal)();
         getHandlers( phs, key ).push( handler );
    }
    handler.isNum = handler.isNum || type === "number" || type ==="range" || isNum !== null;
    
    if( type === "radio" || type === "checkbox" ){
        if( !handler.nodes ) handler.nodes = [];
        handler.nodes.push( node );
    }else{
        handler.nodes = node;
    }
}

protos.normal = function(){};
protos.normal.prototype = {
    fill: function( val ){
        this.nodes.value = val || "";
    },
    clean: function(){
        this.nodes.value = "";
    },
    fetch: function(){
        return toNumber(this.nodes.value, this.isNum);
    }
}
protos.radio = function(){};
protos.radio.prototype = {
    fill: function( val ){
        var nodes = this.nodes,
            len = nodes.length,
            v = "" + val;
        for( var i = 0; i < len; i++ ){
            nodes[i].checked = false;
            if( nodes[i].value === v ){
                nodes[i].checked = true;
            }
        }
    },
    clean: function(){
        var nodes = this.nodes,
            len = nodes.length;
        for( var i = 0; i < len; i++ ){
            nodes[i].checked = false;
        }
    },
    fetch: function(){
        var nodes = this.nodes,
            len = nodes.length;
        for( var i = 0; i < len; i++ ){
            if( nodes[i].checked ){
                return toNumber(nodes[i].value, this.isNum);
            }
        }
    }
}
protos.checkbox = function(){};
protos.checkbox.prototype = {
    fill: function( val ){
        var nodes = this.nodes,
            len = nodes.length;
        !isArray( val ) && ( val = [val] );
        for( var i = 0; i < len; i++ ){
            nodes[i].checked = false;
            for( var j = 0; val && j < val.length; j++ ){
                if( nodes[i].value === "" + val[j] ) nodes[i].checked = true;
            }
        }
    },
    clean: function(){
        var nodes = this.nodes,
            len = nodes.length;
        for( var i = 0; i < len; i++ ){
            nodes[i].checked = false;
        }
    },
    fetch: function(){
        var nodes = this.nodes,
            len = nodes.length;
        var arr = [];
        for( var i = 0; i < len; i++ ){
            if( nodes[i].checked ){
                arr.push( toNumber(nodes[i].value, this.isNum) );
            }
        }
        if( len === 1 ) return arr[0];
        return arr;
    }
}
protos["select-multiple"] = function(){};
protos["select-multiple"].prototype = {
    fill: function( val ){
        var options = this.nodes.childNodes,
            len = options.length;
        for( var i = 0; i < len; i++ ){
            if( options[i].nodeType !== 1 ) continue;
            options[i].setAttribute("selected", "");
            options[i].selected = false;
            for( var j = 0; val && j < val.length; j++ ){
                if( options[i].nodeType === 1 && options[i].value === val[j] ){
                    options[i].setAttribute("selected", "true"); // IE
                    options[i].selected = true; // FF and other
                }
            }
        }
    },
    clean: function(){
        var options = this.nodes.childNodes,
            len = options.length;
        for( var i = 0; i < len; i++ ){
            if( options[i].nodeType === 1 ){
                options[i].setAttribute("selected", ""); // IE
                options[i].selected = false; // FF and other
            }
        }
    },
    fetch: function(){
        var options = this.nodes.childNodes,
            len = options.length,
            arr = [];
        for( var i = 0; i < len; i++ ){
            if( options[i].nodeType === 1 && options[i].selected ){
                val = options[i].value;
                arr.push( toNumber(options[i].value, this.isNum) );
            }
        }
        return arr;
    }
}

function convert( field, exp ){
    return new Function( 'v', 'return ' + exp );
}

function toNumber( val, isNum ){
    isNum && ( val = parseInt(val) );
    return val !== val ? void 0 : val; // val !== val <==> typeof val === "number" && isNaN(val)
}

function isFormField( node ){
    var tagName = node.tagName.toLowerCase();
    if( tagName === "input" || tagName === "textarea" || tagName === "select" ){
        var type = node.type;
        return type !== "image" && type !== "file" && type !== "button" && type !== "reset" && type !== "submit";
    }
    return false;
}

function getField( prefix, field ){
    isArray( prefix ) && ( prefix = prefix.join(".") );
    return prefix && field ? (prefix + "." + field) : (prefix || field);
}

function getHandlers( phs, prefix, field ){
    field = getField( prefix, field );
    if( !phs[field] ) phs[field] = { handlers: [] };
    return phs[field].handlers;
}

function textNode( text ){
    return document.createTextNode("" + text);
}

function isArray( obj ){
    return obj && toString.call(obj) === "[object Array]";
}

function hide( node ){
    node.oldCssText = node.style.cssText;
    node.style.display = "none";
    return node;
}
function show( node ){
    node.style.cssText = node.oldCssText;
    return node;
}

function evaluate( ctx, exp ){
    if( !ctx || !exp ) return null;
    var fs = exp.split("."),
        data = ctx, i;
    for( i = 0; data && i < fs.length; i++ ){
        if( fs[i] ) data = data[ fs[i] ];
    }
    return data;
}

function assemble( data, field, val ){
    if( !data || !field ) return null;
    var fs = field.split(".");
    var temp = data,
        len = fs.length;
    for( var i = 0; i < len - 1; i++ ){
        if( !fs[i] ) continue;
        temp[ fs[i] ] = temp[ fs[i] ] || {};
        temp = temp[ fs[i] ];
    }
    temp[ fs[len-1] ] = val;
    return data;
}

})();