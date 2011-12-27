(function(){

var Dit = window.Dit = {
    create: function( node, opt ){
        node = parseNode( node );
        var phs = {},
            fields = {};
        scan( node, phs, fields, [] );
        node.fill = function( data ){
            fill( phs, fields, data, opt );
            return node;
        };
        node.clean = function(){
            clean( phs );
            return node;
        };
        node.clone = function(){
            return Dit.create( node.cloneNode(true), opt );
        };
        node.fetch = function(){
            return fetch( fields );
        }
        return node;
    }
};

var container = document.createElement("body");
var regex = /(\$?)\{([\w\d\.]*)\}/ig;

function parseNode( node ){
    if( typeof node === "string" ){
        container.innerHTML = node;
        return container.firstChild;
    }
    return node;
}

function fill( phs, fields, data, fns ){
    var val, handlers;
    for( var field in phs ){
        val = evaluate( data, field );
        if( fns && fns[field] !== void 0 ){
            val = typeof fns[field] === "function" ? fns[field]( val, data ) : fns[field];
        }
        if( val === phs[field].val ) continue;
        phs[field].val = val;
        handlers = phs[field].handlers;
        for( var i = 0; i < handlers.length; i++ ){
            handlers[i].fill( val || "" + val );
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

function fetch( fields ){
    var data = {};
    for( var k in fields ){
        assemble( data, k, fields[k].fetch() );
    }
    return data;
}

function scan( node, phs, fields, prefix ){
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
                    t = Dit.create(t).fill(arr[i]);
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
            scan( child, phs, fields, prefix );
        }else if( child.nodeType === 3 ){
            scanText( child, phs, prefix );
        }
    }
}

function scanAttr( node, phs, prefix ){
    var attrs = node.attributes;
    var _phs;
    for( var i = 0; i < attrs.length; i++ ) {
        var _ori = attrs[i].nodeValue;
        if( !_ori || typeof _ori !== "string" ) continue;
        _ori.replace(regex, function( match, has$, field, startIdx ){
            field = getField( prefix, field );
            _phs = _phs || [];
            _phs.push( {f: field, m: match} );
            var attr = attrs[i].nodeName;
            var handler = {
                fill: function( v ){
                    var val = this._ori, ph;
                    for( var i = 0; i < this._phs.length; i++){
                        ph = this._phs[i];
                        val = val.replace( ph.m, phs[ph.f].val );
                    }
                    attr === "class" ? node.className = val : node.setAttribute(attr, val);
                },
                clean: function(){
                    node.removeAttribute( attr );
                },
                _ori: _ori,
                _phs: _phs
            };
            getHandlers(phs, null, field).push( handler );
        });
        _phs = null;
    }
}

function scanText( node, phs, prefix ){
    var parent = node.parentNode;
    var value = node.nodeValue;
    var txt, idx = 0;
    node.nodeValue.replace(regex, function( match, has$, field, startIdx ){
        if( txt = value.substring(idx, startIdx) ) parent.insertBefore( textNode(txt), node );
        var dn = textNode( match );
        var handler = {
            fill: function( val ){
                if( val.jquery ) val = val[0];
                if( val.nodeType !== 1 || !has$ ) val = textNode( val );
                parent.replaceChild( val, this._now );
                this._now = val;
            },
            clean: function(){
                parent.replaceChild( this._empty, this._now );
                this._now = this._empty;
            },
            _ori: dn,
            _now: dn,
            _empty: textNode("")
        };
        getHandlers( phs, prefix, field ).push( handler );
        parent.insertBefore( dn, node );
        idx = startIdx + match.length;
    });
    if( txt = value.substring(idx) ) parent.insertBefore( textNode(txt), node );
    parent.removeChild( node );
}

function scanFormField( node, phs, fields, prefix ){
    var name = node.name,
        type = node.type,
        isNum = node.getAttribute("number"),
        key = getField( prefix, name ),
        handler = fields[key];
    if( !handler ){
         handler = fields[key] = {};
         getHandlers( phs, key ).push( handler );
    }
    handler.isNum = handler.isNum || type === "number" || type ==="range" || isNum !== null;
    
    if( type === "radio" || type === "checkbox" ){
        if( !handler.nodes ) handler.nodes = [];
        handler.nodes.push( node );
    }else{
        handler.nodes = node;
    }
    if( !handler.fill ) copy( handler, prototype[type] || prototype.normal);
}

var prototype = {};
prototype.normal = {
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
prototype.radio = {
    fill: function( val ){
        var nodes = this.nodes,
            len = nodes.length;
        for( var i = 0; i < len; i++ ){
            nodes[i].checked = false;
            if( nodes[i].value === "" + val ){
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

prototype.checkbox = {
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

prototype["select-multiple"] = {
    fill: function( val ){
        var options = this.nodes.childNodes,
            len = options.length;
        for( var i = 0; i < len; i++ ){
            if( options[i].nodeType !== 1 ) continue;
            options[i].setAttribute("selected", "");
            options[i].selected = false;
            for( var j = 0; val && j < val.length; j++ ){
                if( options[i].nodeType === 1 && options[i].value === val[j] ) {
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

function copy( target, source ){
    for( var k in source ){
        target[k] = source[k];
    }
}

function isArray( obj ){
    return obj && Object.prototype.toString.call(obj) === "[object Array]";
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