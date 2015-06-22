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

nonprint = [16,17,18,20,27,33,34,35,36,37,38,39,40,45,91,92,93,112,113,114,115,116,117,118,119,120,121,122,123,144,145]

function tagsig(name) {
  return '<span class="tb_tag"><span class="nametag">'+name+'</span><span class="deltag">x</span></span>';
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
          connectHandlers();
        } else if (cmd == 'success') {
          var box = $(".tb_box[tid="+cont['oldid']+"]")
          box.attr("tid",cont['newid']);
          box.attr("modified","false");
        } else if (cmd == 'set') {
          var box = $(".tb_box[tid="+cont['id']+"]");
          box.find(".tb_title").html(cont['title']);
          box.find(".tb_tag").remove();
          $(cont['tags']).each(function() {
            box.find(".tb_tags").append(tagsig($(this)[0]));
          });
          console.log(cont['body']);
          box.find(".tb_body").html(cont['body']);
          box.attr("modified","false");
        } else if (cmd == 'new') {
          var html = json_data['content'];
          $("#output").html(html);
          connectHandlers();
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

function connectHandlers() {
  $(".tb_box").each(function() {
    var box = $(this);

    box.keyup(function(event) {
      if (!(nonprint.contains(event.keyCode))) {
        box.attr("modified","true");
      }
    });

    box.find(".deltag").click(function(event) {
      var tag = $(this).parent();
      tag.remove();
      box.attr("modified","true");
    });

    box.find(".newtag").click(function(event) {
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
          event.preventDefault();
        }
      });
      deltag.click(function(event) {
        tag.remove();
        box.attr("modified","true");
      });
    });

    box.find(".revert").click(function(event) {
      var tid = box.attr("tid");
      var msg = JSON.stringify({"cmd": "get", "content": tid});
      ws.send(msg)
    });

    box.find(".save").click(function(event) {
      var tid = box.attr("tid");
      var title = box.find(".tb_title").text();
      var tags = box.find(".nametag").map(function() { return $(this).text() } ).toArray();
      var body = box.find(".tb_body").html();
      var msg = JSON.stringify({"cmd": "set", "content": {"tid":tid, "title":title, "tags": tags, "body": body}});
      console.log(msg);
      ws.send(msg);
      box.attr("modified","false");
    });

    box.find(".delete").click(function(event) {
      var tid = box.attr("tid");
      var msg = JSON.stringify({"cmd": "delete", "content": tid});
      ws.send(msg);
    });
  });
}

$(document).ready(function () {
  connect();

  $("#query").keypress(function(event) {
    if (event.keyCode == '13') {
      var text = $("#query").text();
      send_query(text);
      event.preventDefault();
    }
  });

  $("#new").click(function() {
    var msg = JSON.stringify({"cmd": "new", "content": ""});
    ws.send(msg);
  });
});
