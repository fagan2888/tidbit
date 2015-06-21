# tidbits interface

import os
import sqlite3

from itertools import product
from collections import defaultdict
from operator import itemgetter

# utils
def extract(arr,idx=0):
  return map(itemgetter(idx),arr)

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

  cur.execute('create table tidbit (id int, field text, value text)')
  cur.execute('create unique index idx_all on tidbit (id,field,value)')

  con.close()

def connect(fname,create=True):
  try:
    ret = os.stat(fname)
  except OSError:
    print 'File not found.'
    if create:
      print 'Creating.'
      initialize(fname)
    else:
      print 'Aborting.'
      return

  return Connection(fname)

class TripleStore(object):
  def __init__(self,fname):
    self.sql_con = sqlite3.connect(fname)
    self.sql_cur = self.sql_con.cursor()

  def all_ids(self):
    return extract(self.sql_cur.execute('select distinct id from tidbit').fetchall())

  def next_id(self):
    (top,) = self.sql_cur.execute('select max(id) from tidbit').fetchone()
    return 0 if top is None else top+1

  def fetch(self,id):
    ret = self.sql_cur.execute('select field,value from tidbit where id=?',(id,)).fetchall()
    if not ret:
      print 'Id not found.'
      return
    else:
      d = defaultdict(list)
      for (f,v) in ret:
        d[f].append(v)
      return d

  def delete_id(self,id):
    self.sql_cur.execute('delete from tidbit where id=?',(id,))
    self.sql_con.commit()

  def get_field(self,id,field):
    ret = self.sql_cur.execute('select value from tidbit where id=? and field=?',(id,field)).fetchall()
    if len(ret) == 0:
      return
    elif len(ret) == 1:
      return ret[0]
    else:
      return ret

  def set_field(self,id,field,value):
    if type(value) in (list,tuple):
      group = '\'' + '\',\''.join(map(str,value)) + '\'' if len(value) > 0 else ''
      self.sql_cur.execute('delete from tidbit where id=? and field=? and value not in (%s)' % group,(id,field))
      self.sql_cur.executemany('insert or ignore into tidbit values (?,?,?)',product([id],[field],value))
    else:
      self.sql_cur.execute('update tidbit set value=? where id=? and field=?',(value,id,field))
      self.sql_cur.execute('insert or ignore into tidbit values (?,?,?)',(id,field,value))
    self.sql_con.commit()

  def find_field(self,field,value):
    name = '\'%s\'' % field
    wild = '\'%s\'' % value
    cmd = 'select distinct id from tidbit where field=%s and value=%s' % (name,wild)
    return extract(self.sql_cur.execute(cmd).fetchall())

  def search_field(self,field,term):
    name = '\'%s\'' % field
    wild = '\'%%%s%%\'' % term
    cmd = 'select distinct id from tidbit where field=%s and value like %s' % (name,wild)
    return extract(self.sql_cur.execute(cmd).fetchall())

class Connection(TripleStore):
  def __init__(self,fname):
    TripleStore.__init__(self,fname)

  def get_by_id(self,id):
    d = self.fetch(id)
    if d is None:
      return
    else:
      title = d.pop('title',[''])[0]
      body = d.pop('body',[''])[0]
      tags = d.pop('tag',[])
      return Tidbit(id=id,title=title,body=body,tags=tags,fields=d)

  def delete(self,tb):
    self.delete_id(tb.id)
    tb.id = None

  def save(self,tb):
    if tb.id is None:
      tb.id = self.next_id()
    self.set_field(tb.id,'title',tb.title)
    self.set_field(tb.id,'body',tb.body)
    self.set_field(tb.id,'tag',list(tb.tags))
    for (f,v) in tb.fields.items():
      self.set_field(tb.id,f,v)

  def search_title(self,title):
    return self.search_field('title',title)

  def search_body(self,body):
    return self.search_field('body',body)

  def search_tag(self,tag):
    return self.search_field('tag',tag)

  def search(self,term):
    return list(set(self.search_title(term)+self.search_body(term)+self.search_tag(term)))

  def find_tag(self,tag):
    return self.find_field('tag',tag)

class Tidbit:
  def __init__(self,id=None,title='',body='',tags=[],fields={}):
    self.id = id
    self.title = title
    self.body = body
    self.tags = set(tags)
    self.fields = fields

  def __repr__(self):
    ttxt = ', '.join(self.tags)
    ftxt = '\n'.join(['%s: %s' % kv for kv in self.fields.items()])
    return '%s [%s]\n\n%s\n\n%s' % (self.title,ttxt,self.body,ftxt)

  def set_title(self,title):
    self.title = title

  def set_body(self,body):
    self.body = body

  def add_tag(self,tag):
    self.tags.add(tag)

  def del_tag(self,tag):
    if tag in self.tags:
      self.tags.remove(tag)
