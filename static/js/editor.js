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
    console.log('Error:' + exception);
  }
}

function select_all(elem) {
  var selection = window.getSelection();        
  var range = document.createRange();
  range.selectNodeContents(elem);
  selection.removeAllRanges();
  selection.addRange(range);
}

function connect()
{
  if ('MozWebSocket' in window) {
    WebSocket = MozWebSocket;
  }
  if ('WebSocket' in window) {
    var ws_con = "ws://" + window.location.host + "/tidbit";
    console.log(ws_con);

    ws = new WebSocket(ws_con);

    ws.onopen = function() {
      console.log('websocket connected!');
      send_query('');
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
      console.log('websocket closed');
    };
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
    $("#query").text(tag);
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

$(document).ready(function () {
  save_box = function(box) {
    var tid = box.attr("tid");
    var title = box.find(".tb_title").text();
    var tags = box.find(".nametag").map(function() { return $(this).text() } ).toArray();
    var body = box.find(".tb_body").html();
    var msg = JSON.stringify({"cmd": "set", "content": {"tid":tid, "title":title, "tags": tags, "body": body}});
    console.log(msg);
    ws.send(msg);
  }

  revert_box = function(box) {
    var tid = box.attr("tid");
    var msg = JSON.stringify({"cmd": "get", "content": tid});
    ws.send(msg);
  }

  delete_box = function(box) {
    var tid = box.attr("tid");
    var msg = JSON.stringify({"cmd": "delete", "content": tid});
    ws.send(msg);
  }

  new_tag = function(box) {
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

  delete_tag = function(box,tag) {
    tag.remove();
    box.attr("modified","true");
    box.find(".tb_body").focus();
  }

  connect();

  $("#query").keypress(function(event) {
    if (event.keyCode == 13) {
      var text = $("#query").text();
      send_query(text);
      event.preventDefault();
    }
  });

  $("#new").click(function() {
    var msg = JSON.stringify({"cmd": "new", "content": ""});
    ws.send(msg);
  });

  $(document).unbind('keydown').bind('keydown',function() {
    if (event.keyCode == 8) {
      if (!event.target.getAttribute("contentEditable")) {
        event.preventDefault();
      }
    }
  });
});
