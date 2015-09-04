// Why!?!
Array.prototype.contains = function(obj) {
  var i = this.length;
  while (i--) {
    if (this[i] === obj) {
      return true;
    }
  }
  return false;
}

function tagsig(name) {
  return '<span class="tb_tag"><span class="nametag">'+name+'</span><span class="deltag">x</span></span>\n';
}

function send_query(text) {
  try {
    var msg = JSON.stringify({"cmd": "query", "content": text});
    ws.send(msg);
    console.log('Sent: ' + msg);
  } catch (exception) {
    console.log('Error (' + txt + '):' + exception);
  }
}

function select_all(elem) {
  var selection = window.getSelection();
  var range = document.createRange();
  range.selectNodeContents(elem);
  selection.removeAllRanges();
  selection.addRange(range);
}

function create_websocket(first_time) {
  ws = new WebSocket(ws_con);

  ws.onopen = function() {
    console.log('websocket connected!');
    if (first_time) {
      send_query('');
    }
  };

  ws.onmessage = function (evt) {
    var msg = evt.data;
    // console.log('Received: ' + msg);

    var json_data = JSON.parse(msg);
    if (json_data) {
      var cmd = json_data['cmd'];
      var cont = json_data['content'];
      if (cmd == 'results') {
        var html = json_data['content'];
        $("#output").html(html);
        $(".tb_box").each(function() { connectHandlers($(this)); });
      } else if (cmd == 'success') {
        var box = $(".tb_box[tid="+cont['oldid']+"]")
        box.attr("tid",cont['newid']);
        box.attr("modified","false");
      } else if (cmd == 'set') {
        var tid = cont['id'];
        var box = $(".tb_box[tid="+tid+"]");
        box.replaceWith(cont['box']);
        box = $(".tb_box[tid="+tid+"]");
        connectHandlers(box);
      } else if (cmd == 'new') {
        var html = json_data['content'];
        $("#output").html(html);
        $(".tb_box").each(function() { connectHandlers($(this)); });
        var box = $("#output").find(".tb_box");
        box.attr("modified","true");
        var title = box.find(".tb_title");
        select_all(title[0]);
      } else if (cmd == 'remove') {
        $("#output").children(".tb_box[tid="+cont['id']+"]").remove();
      }
    }
  };

  ws.onclose = function() {
    console.log('websocket closed, attempting to reconnect');
    setTimeout(function() {
      create_websocket(false);
    }, 1);
  };
}

function connect()
{
  if ('MozWebSocket' in window) {
    WebSocket = MozWebSocket;
  }
  if ('WebSocket' in window) {
    ws_con = "ws://" + window.location.host + "/tidbit";
    console.log(ws_con);
    create_websocket(true);
  } else {
    console.log('Sorry, your browser does not support websockets.');
  }
}

function disconnect()
{
  if (ws) {
    ws.close();
  }
}

function connectHandlers(box) {
  box.bind("input", function() {
    box.attr("modified","true");
  });

  box.keydown(function(event) {
    if ((event.keyCode == 13) && event.shiftKey) {
      if (box.attr("modified") == "true") {
        save_box(box);
      }
      event.preventDefault();
    } else if ((event.keyCode == 13) && event.metaKey) {
      new_tag(box);
    } else if (event.keyCode == 27) {
      if (box.attr("modified") == "true") {
        revert_box(box);
      }
    }
  });

  box.find(".tb_title").keydown(function(event) {
    if (event.keyCode == 13) {
      if (!event.shiftKey) {
        event.preventDefault();
      }
    }
  });

  box.find(".nametag").dblclick(function(event) {
    var tag = '#'+$(this).text();
    $("#query").attr("value",tag);
    send_query(tag);
  });

  box.find(".deltag").click(function(event) {
    var tag = $(this).parent();
    delete_tag(box,tag);
  });

  box.find(".newtag").click(function(event) {
    new_tag(box);
  });

  box.find(".revert").click(function(event) {
    revert_box(box);
  });

  box.find(".save").click(function(event) {
    save_box(box);
  });

  box.find(".delete").click(function(event) {
    delete_box(box);
  });
}

/*
function strip_tags(html) {
  if (html.startsWith('<div>')) {
    html = html.replace(/<div>/,'');
  }
  return html.replace(/<div ?.*?>/g,'\n')
             .replace(/<\/div>/g,'')
             .replace(/<br>/g,'')
             .replace(/<span ?.*?>/g,'')
             .replace(/<\/span>/g,'');
}
*/

function save_box(box) {
  var tid = box.attr("tid");
  var title = box.find(".tb_title").text();
  var tags = box.find(".nametag").map(function() { return $(this).text() } ).toArray();
  var body = box.find(".tb_body").html();
  var msg = JSON.stringify({"cmd": "set", "content": {"tid":tid, "title":title, "tags": tags, "body": body}});
  console.log(msg);
  ws.send(msg);
}

function revert_box(box) {
  var tid = box.attr("tid");
  var msg = JSON.stringify({"cmd": "get", "content": tid});
  ws.send(msg);
}

function delete_box(box) {
  var tid = box.attr("tid");
  var msg = JSON.stringify({"cmd": "delete", "content": tid});
  ws.send(msg);
}

function new_tag(box) {
  var tag = $(tagsig(""));
  box.find(".tb_tags").append(tag);
  box.attr("modified","true");
  var nametag = tag.children(".nametag");
  var deltag = tag.children(".deltag");
  nametag.attr("contentEditable","true");
  select_all(nametag[0]);
  nametag.keydown(function(event) {
    if (event.keyCode == 13) {
      nametag.attr("contentEditable","false");
      box.find(".tb_body").focus();
      event.preventDefault();
    }
  });
  deltag.click(function(event) {
    delete_tag(box,tag);
  });
}

function delete_tag(box,tag) {
  tag.remove();
  box.attr("modified","true");
  box.find(".tb_body").focus();
}

$(document).ready(function () {
  connect();

  $("#query").keypress(function(event) {
    if (event.keyCode == 13) {
      var text = $("#query").attr("value");
      send_query(text);
      event.preventDefault();
    }
  });

  $("#new").click(function() {
    var title = $("#query").attr("value");
    var msg = JSON.stringify({"cmd": "new", "content": title});
    ws.send(msg);
  });

  $(document).unbind("keydown").bind("keydown",function() {
    if (event.keyCode == 8) {
      if (!event.target.getAttribute("contentEditable") && (event.target.tagName.toLowerCase() != "input")) {
        console.log('rejecting backspace: ',event.target.tagName);
        event.preventDefault();
      }
    }
  });
});
