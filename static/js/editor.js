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
    };

    ws.onmessage = function (evt) {
      var msg = evt.data;
      console.log('Received: ' + msg);

      var json_data = JSON.parse(msg);
      if (json_data) {
        var html = '';
        for (id in json_data) {
          tb = json_data[id];
          html += '<div class="tb_box">';
          html += '<div class="tb_title">' + tb['title'] + '&nbsp;&nbsp;' 
                + '<span class="tb_tags">' + '[' + tb['tags'] + ']' + '</span>' + '</div>';
          html += '<div class="tb_body">' + tb['body'] + '</div>';
          html += '</div>';
        }
        $("#output").html(html);
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

$(document).ready(function () {
  connect();

  function send() {
    var text = $("#query").val();
    try {
      ws.send(text);
      console.log('Sent: ' + text);
    } catch (exception) {
      console.log('Error:' + exception);
    }
  }

  $("#query").keypress(function(event) {
    if (event.keyCode == '13') {
      send();
    }
  });

});
