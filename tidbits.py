# tidbits interface

import os
import sqlite3

# initialize a db in a file
def initialize(fname):
  try:
    ret = os.stat(fname)
  except OSError:
    pass
  else:
    print 'File exists.'
    return

  con = sqlite3.connect(fname)
  cur = con.cursor()

  cur.execute('create table tidbit (id integer primary key, title text, body text)')
  cur.execute('create table tag (id int, name text)')
  cur.execute('create unique index id_idx on tag(id,name)')

  con.close()

def connect(fname):
  try:
    ret = os.stat(fname)
  except OSError:
    print 'File not found.'
    return None

  return Connection(fname)

class Connection:
  def __init__(self,fname):
    self.sql_con = sqlite3.connect(fname)
    self.sql_cur = self.sql_con.cursor()

  def fetch(self,id):
    ret = self.sql_cur.execute('select id,title,body from tidbit where id=?',(id,)).fetchone()
    if ret:
      tb = Tidbit()
      (tb.id,tb.title,tb.body) = ret
      tags = self.sql_cur.execute('select name from tag where id=?',(tb.id,)).fetchall()
      tb.tags = zip(*tags)[0] if tags else []
      return tb
    else:
      print 'Id not found.'

  def delete(self,id):
    pass

  def save(self,tb):
    if self.sql_cur.execute('select * from tidbit where id=?',(tb.id,)).fetchone():
      self.sql_cur.exeucte('update tidbit set title=?, body=? where id=?',(tb.title,tb.body,tb.id))
    else:
      tb.id = (self.sql_cur.execute('select max(id) from tidbit').fetchone()[0] or 0) + 1
      self.sql_cur.execute('insert into tidbit values (?,?,?)',(tb.id,tb.title,tb.body))
    self.sql_cur.executemany('insert into tag values (?,?)',zip([tb.id]*len(tb.tags),tb.tags))
    self.sql_con.commit()

  def search(title_key=None,body_key=None):
    terms = filter(lambda (_,x): x is not None,[('title',title_key),('body',body_key)])
    conds = ' and '.join(['%s like %%%s%%' % t for t in terms])
    ret = self.sql_cur.execute('select id,title from tidbit where '+conds)
    for (id,title) in ret:
      print '%10i: %s' % (id,title)

class Tidbit:
  def __init__(self,title='',tags=[],body='',id=None):
    self.id = id
    self.title = title
    self.tags = tags
    self.body = body

  def __repr__(self):
    return '%s [%s]\n\n%s' % (self.title,', '.join(self.tags),self.body)
