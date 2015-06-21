import os
import sys
import json

import tornado.ioloop
import tornado.web
import tornado.websocket
import tidbit as tb

if len(sys.argv) <= 1:
  print "database filename required"

fname = sys.argv[1]
con = tb.connect(fname)

results_str = """
{% for tb in results %}
  <div class="tb_box" tid="{{ tb.id }}" selected="false" modified="false">
    <div class="tb_header">
      <span class="tb_title" contentEditable="true">{{ tb.title }}</span>
      <span class="tb_tags">
      {% for tag in tb.tags %}
      <span class="tb_tag"><span class="nametag">{{ tag }}</span><span class="deltag">x</span></span>
      {% end %}
      </span>
      <span class="newtag">+</span>
    </div>
    <div class="tb_body" contentEditable="true">{{ tb.body }}</div>
    <div class="revert control">Revert</div>
    <div class="save control">Save</div>
    <div class="delete control">x</div>
  </div>
{% end %}
"""
results_template = tornado.template.Template(results_str)

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

    def on_message(self, msg):
        print 'received message: {0}'.format(msg)
        data = json.loads(msg)
        (cmd,cont) = (data['cmd'],data['content'])
        if cmd == 'query':
          try:
            if cont.startswith('#'):
              ids = con.find_tag(cont[1:].strip())
            elif cont.startswith('title:'):
              ids = con.search_title(cont[6:].strip())
            elif cont.startswith('body:'):
              ids = con.search_body(cont[5:].strip())
            elif cont.startswith('tag:'):
              ids = con.search_tag(cont[4:].strip())
            else:
              ids = con.search(cont.strip())
            tds = map(con.get_by_id,ids)
            gen = results_template.generate(results=tds)
          except Exception as e:
            print e
            gen = 'Error'
          self.write_message(json.dumps({'cmd': 'results', 'content': gen}))
        elif cmd == 'set':
          try:
            oldid = cont['tid']
            id = None if oldid == "new" else oldid
            tid = tb.Tidbit(id=id,title=cont['title'],body=cont['body'],tags=cont['tags'])
            con.save(tid)
            self.write_message(json.dumps({'cmd': 'success', 'content': {'oldid': oldid, 'newid': tid.id}}))
          except Exception as e:
            print e
        elif cmd == 'get':
          try:
            tid = con.get_by_id(cont)
            if tid:
              self.write_message(json.dumps({'cmd': 'set', 'content': {'id': cont, 'title': tid.title, 'body': tid.body, 'tags': list(tid.tags)}}))
          except Exception as e:
            print e
        elif cmd == 'new':
          try:
            tid = tb.Tidbit()
            tid.id = "new"
            tid.set_title("Title")
            tid.set_body("")
            gen = results_template.generate(results=[tid])
            self.write_message(json.dumps({'cmd': 'new', 'content': gen}))
          except Exception as e:
            print e
        elif cmd == 'delete':
          try:
            con.delete_id(cont)
            self.write_message(json.dumps({'cmd': 'remove', 'content': {'id': cont}}))
          except Exception as e:
            print e

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
