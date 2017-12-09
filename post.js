var Post = {
  new: function() {
    var date = new Date();
    var meta = {
      categories: '杂项',
      tags: '',
      layout: 'post',
      title: 'Unnamed',
      date: date.toISOString(),
      create: date.toISOString()
    };
    return {
      content: "",
      meta: meta,
      sha: null
    };
  },

  sync: function(posts, callback) {
    callback = callback || function() {};
    var postMap = {};
    posts.forEach(function(post) {
      if (post.sha)
        postMap[post.sha] = post;
    });
    Github.fetchPostList(function(e, s, r) {
      var post_infos = JSON.parse(r);
      var count = post_infos.length;
      var newPosts = [];
      function pushPosts(post) {
        newPosts.push(post);
        if (newPosts.length == post_infos.length) {
          callback(Post._sortPost(newPosts));
        }
      }
      post_infos.forEach(function(post_info) {
        post = postMap[post_info.sha];
        if (post !== null && post !== undefined) {
          pushPosts(postMap[post_info.sha]);
        } else {
            Post._fetchPost(post_info.path, function(post) {
              pushPosts(post);
            });
        }
      });
    });
  },

  _fetchPost: function(path, callback) {
    Github.fetchPostContent(path, function(c) {
      var post = Post.parse(c.content);
      post['sha'] = c.sha;
      post.meta.slug = c.slug;
      post.meta.date = c.date;
      callback(post);
    });
  },

  _sortPost: function(posts) {
    return posts.sort(function(a, b) {
      var date1 = new Date(a.meta.date);
      var date2 = new Date(b.meta.date);
      if (date1 > date2)
        return -1;
      if (date1 < date2)
        return 1;
      return 0;
    });
  },

  update: function(post, callback) {
    callback = callback || function() {};
    var date = new Date(post.meta.date);
    var datestr = date.getFullYear() + '-' +
      ("0" + (date.getMonth() + 1)).slice(-2) + '-' +
      ("0" + date.getDate()).slice(-2);
    var name = datestr +'-'+ post.meta.slug.replace(/\s+/g, "-");
    var content = Post.dump(post);
    var sha = post.sha;
    var filename = name + '.md';
    var path = '_posts/'+ filename;
    Github.updateContent(path, filename, content, sha, function(e, s, r){
      var json = JSON.parse(r);
      if(s == '200') {  //Done
        post.sha = json.content.sha;
        callback(false, "updated");
      } else if(s == '201') { //Created
        post.sha = json.content.sha;
        callback(false, "created");
      } else if(s == '409') { //Failed
        callback(true, "conflict");
      } else {
        callback(true, "unknow");
      }
    });
  },

  dump: function(post) {
    var rst='';
    var contentstr = post.content;
    var meta = $.extend({}, post.meta);
    var date = new Date();
    meta.date = date.toISOString();
    delete meta.slug;
    if (meta.published) {
      delete meta.published;
    }
    if (meta.categories && meta.categories.length == 1) {
      meta.category = meta.categories[0];
      delete meta.categories;
    }
    if (meta.tags && meta.tags.length == 1) {
      if (meta.tags[0] == "") {
        delete meta.tags;
      }
    }
    var metastr = YAML.stringify(meta);
    rst = rst + '---\n';
    rst = rst + metastr;
    rst = rst + '---\n';
    rst = rst + contentstr;
    return rst;
  },

  parse: function(rawContent) {
    var mt;
    //get the yaml matters
    var patt = /---([\s\S]*?)---(\r\n|\n)([\s\S]*)/;
    var res = rawContent.match(patt);
    mt = {};
    mt['meta'] = YAML.parse(res[1]);
    mt['content'] = res[3];
    if (mt.meta.published === undefined || mt.meta.published === null) {
      mt.meta.published = true;
    }
    return mt;
  }
};
