import os
import sys
import json

import tornado.ioloop
import tornado.web
import tornado.websocket
import tidbits

if len(sys.argv) <= 1:
  print "database filename required"

fname = sys.argv[1]
con = tidbits.connect(fname)

class EditorHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("editor.html")

class TidbitHandler(tornado.websocket.WebSocketHandler):
    def initialize(self):
        print "initializing"

    def allow_draft76(self):
        return True

    def open(self):
        print "connection received"

    def on_close(self):
        print "connection closing"

    def error_msg(self, error_code):
        if not error_code is None:
            json_string = json.dumps({"type": "error", "code": error_code})
            self.write_message("{0}".format(json_string))
        else:
            print "error code not found"

    def on_message(self, message):
        print "received message: {0}".format(message)
        try:
          ids = con.find_tag(message)
          tds = map(con.get_by_id,ids)
          dicts = {td.id: {'title': td.title, 'body': td.body, 'tags': list(td.tags)} for td in tds}
          self.write_message(json.dumps(dicts))
        except Exception as e:
          print e
          self.write_message('Error')

# tornado content handlers
class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", EditorHandler),
            (r"/tidbit", TidbitHandler)
        ]
        settings = dict(
            app_name=u"Tidbit Editor",
            template_path="templates",
            static_path="static",
            xsrf_cookies=True,
        )
        tornado.web.Application.__init__(self, handlers, debug=True, **settings)

if __name__ == "__main__":
    application = Application()
    application.listen(9000)
    tornado.ioloop.IOLoop.current().start()
