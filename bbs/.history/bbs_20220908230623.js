const express = require('express')
const cookieParser = require('cookie-parser')
const fs = require('fs')
const uuid = require('uuid').v4
const svgCaptcha = require('svg-captcha')
const md5 = require('md5')
const Database = require('better-sqlite3')
const formidable = require('formidable');


const db = new Database('./bbs.sqlite3') // 链接数据库文件

const port = 8080

const app = express()

app.locals.pretty = true    // 让pug输出格式化过的html代码
app.set('views',__dirname + '/tamplates')  // 设置模板文件夹为tamplates

app.use(express.urlencoded({extended:true}))  // 能够解析扩展express url的请求体
app.use(cookieParser('asdasasd'))    // 生成签名的种子
app.use(express.static(__dirname + '/assets'))


// app.use((req,res,next) => {
//   console.log(req.cookies,req.signedCookies)  // 读取cookie  signedCookies将签名后的cookies转换成原始内容存入
//   next()
// })

var sessionObjects = {}
app.use(function sessionMW(req,res,next) {   // 通过会话框的id来判断页面 同一个会话的sessionId相同 根据sessionId判断是否是同一个浏览器
  if (!req.cookies.sessionId) {  // 如果请求中没有sessionId 生成
    var sessionId = uuid()
    res.cookie('sessionId', sessionId)  // 下发
    req.cookies.sessionId = sessionId
  }

  req.session = sessionObjects[req.cookies.sessionId] ?? (sessionObjects[req.cookies.sessionId] = { })
  next()
})

app.use(function(req,res,next) {  // 根据已经登录了的信息查出用户
  if (req.signedCookies.loginName) {
    req.loginUser = db.prepare('SELECT rowid as userId, name, email FROM users WHERE name = ?').get(req.signedCookies.loginName)
  } else {
    req.loginUser = null
  }

  next()
})

app.get('/', (req,res,next) => {  // get首页
  res.type('html')
  var posts = db.prepare(`
    SELECT posts.rowid AS postId, title, content, createdAt, userId, name
    FROM posts
    JOIN users
    ON posts.userId = users.rowid
    ORDER BY createdAt DESC
  `).all()

  res.render('index.pug',{  // 使用模板文件 路径和在前面已经声明了 第二个参数为给模板的数据
    posts: posts,
    user: req.loginUser,
  })
})

app.get('/register', (req,res,next) => {   // 注册页面
  res.type('html')
  res.render('register.pug')
})

app.post('/register',(req,res,next) => {   // 判断用户名,邮箱是否存在 ,两次密码是不是一致
  res.type('html')

  const form = formidable({
    multiples: true,
    uploadDir: './uploads',
    keepExtensions: true,
    maxFileSize: 2 * 1024 * 1024,
  });

  form.parse(req, (err, fields, files) => {
    var regInfo = fields

    if (regInfo.password !== regInfo.password1) {
      res.end('两次密码输入错误,请重新输入')
      return
    }
  })
  let regInfo = req.body  // 注册信息


  var user = {     // 存储用户信息
    name: regInfo.name,
    email: regInfo.email,
    password: md5(regInfo.password),   // 密码加密
  }

  let reg = /^[\w]{1}[\w\\d]{5,10}/i // 用户名长度6-10位，由数字，字母，下划线组成，且不能以数字开头，字母不区分大小写。
  if (reg.test(regInfo.name)) {
    try {
      db.prepare('INSERT INTO users (name,password,email) VALUES($name,$password,$email)').run(user)

    } catch(e) {
      if (e.code == 'SQLITE_CONSTRAINT_UNIQUE') {
        res.type('html').end('用户名或电子邮箱冲突')
        return
      } else {
        throw e
      }
    }
    res.end('注册成功,go<a href="/login">登录</a>')
  } else {
    res.end('用户名长度6-10位，由数字，字母，下划线组成，且不能以数字开头，字母不区分大小写。')
  }

  if (regInfo.password !== regInfo.password1) {
    res.write('两次密码输入不一致')
    return
  }




})

app.get('/login',(req,res,next) => {   // 登录页面
  res.type('html')
  var returnUrl = req.query.next ?? req.get('referer') ?? '/'

  res.render('login.pug',{
    returnUrl: returnUrl,
    session: req.session,
  })

  req.session.刚刚登录失败的原因 = null
})

app.post('/login',(req,res,next) => {   // 判断是否登录成功
  res.type('html')
  var loginInfo = req.body

  var returnUrl = req.query.next ?? '/'    // req的query可以读到url中的querystring 地址栏login/ 后面的内容


  if (req.session.loginFailCount >= 3 && req.body.captcha !== req.session.captcha) {
    req.session.刚刚登录失败的原因 = '验证码错误'
    res.redirect('back')
    return
  }

  req.session.captcha = null // 防止一个验证码用来登陆多次

  // loginInfo.password = md5(loginInfo.password)

  var target = db.prepare('SELECT * FROM users WHERE name = $name AND password = $password').get(loginInfo)

  if (target) {
    res.cookie('loginName',target.name,{
      maxAge: 86400000,    // 最大有效期 以秒为单位
      signed: true,      //签名之后发送
    })

    req.session.loginFailCount = 0    // 登录成功 登录错误次数重新归零
    res.redirect(returnUrl)    // 返回首页

  } else {
    req.session.loginFailCount = (req.session.loginFailCount ?? 0) + 1
    req.session.刚刚登录失败的原因 = '用户名或密码错误'
    res.redirect('/login?next=' + returnUrl)
  }
})

app.get('/captcha',(req,res,next) => {  // 验证码图片生成
  var captcha = svgCaptcha.create({     // 创建验证码
    color: true,      // 随机颜色
    noise:10,         // 线条数量
  })

  req.session.captcha = captcha.text  // 通过sessionId查到同一个浏览器

  console.log(req.session.captcha)
  res.type('svg').end(captcha.data)
})

app.get('/user/:userName',(req,res,next) => {  // 用户主页
  res.type('html')
  var userId = req.params.userId
  var user = db.prepare('SELECT rowid as userId, * FROM users WHERE userId = ?').get(userId)

  if (user) {
    // 发过的帖子
    var posts = db.prepare('SELECT * FROM posts JOIN users ON posts.userId = users.rowid WHERE userId = ?').all(userId)


    // 回复过的评论

    var comments = db.prepare(`
      SELECT comments.content,comments.userId, comments.createdAt,postId,title,avatar
      FROM comments J
      OIN users
      ON comments.userId = users.rowid
      JOIN posts
      ON comments.postId = posts.rowid
      WHERE comments.userId = ?`
      ).all(userId)

    res.render('user.pug', {
      user,
      posts,
      comments,
    })
  } else {
    res.end('查无此人')
  }
})

app.get('/add-post', (req, res, next) => { // 发帖页面
  res.type('html')
  res.render('add-post.pug',{
    user: req.loginUser
  })
})

app.post('/add-post', (req, res, next) => { // 根据用户名发帖
  res.type('html')
  if (req.loginUser) {  // 签了名的用户 当前用户的用户名
    var postInfo = req.body
    var user = db.prepare('SELECT rowid as id, * FROM users WHERE name = ?').get(req.loginUser)

    var post = {
      title: postInfo.title,
      content: postInfo.content,
      createdAt: new Date().toISOString(),
      userId: user.id,
    }

    var info = db.prepare('INSERT INTO posts (title,content,createdAt,userId) VALUES ($title,$content,$createdAt,$userId)').run(post)

    res.redirect('/post/' + info.lastInsertRowid)
  } else {
    res.end('登录后才能发帖')
  }

})

app.get('/post/:id',(req,res,next) => {   // 发帖人信息和发帖 以及评论 评论人信息
  res.type('html')
  var postId = req.params.id     // 当前帖子id

  var post = db.prepare(`
    SELECT posts.rowid AS postId, title, content, createdAt, userId, name, avatar
    FROM posts
    JOIN users
    ON posts.userId = users.rowid
    WHERE postId = ?
  `).get(postId)

  if (post) {
    const comments = db.prepare(`
      SELECT comments.rowid as commentId, content, createdAt, userId, name, avatar, postId
      FROM comments
      JOIN users
      ON userId = users.rowid
      WHERE postId = ?
    `).all(post.postId)

    res.render('post.pug', {
      post: post,
      comments: comments,
      user: req.loginUser,
    })
  } else {
    res.render('404.pug')
  }
})

app.post('/comment/:postId',(req,res,next) => {  // 评论人信息
  res.type('html')
  var commentInfo = req.body
  var postId = req.params.postId

  var user = db.prepare('SELECT rowid as userId, * FROM users WHERE name = ?').get(req.loginUser)

  if (user) {
    var comment = {
      content: commentInfo.content,   // 帖子内容
      createdAt: new Date().toISOString(),
      userId: user.userId,   // 用户id
      postId: postId,   // 帖子id
    }

    var insertInfo = db.prepare(`
      INSERT INTO comments
      VALUES ($content, $createdAt, $userId, $postId)
    `).run(comment)

    res.json({
      userId: user.userId,
      userName: user.name,
      commentId: insertInfo.lastInsertRowid
    })

  } else {
    res.json({
      error: '请先登录在评论'
    })
  }
})

app.delete('/post/:id',(req,res,next) => {   // 删帖
  res.type('html')
  if (req.loginUser) {
    var post = db.prepare('SELECT * FROM posts WHERE rowid = ?').get(req.params.id)
    if (post) {
      if (post.userId == req.loginUser.userId) {
        db.prepare('DELETE FROM posts WHERE rowid = ?').run(req.params.id)
        res.end('删除成功')
      }
    } else {
      res.end('帖子不存在')
    }
  } else {
    res.end('未登录')
  }
})

app.delete('/comment/:commentId',(req,res,next) => {  // 删除评论
  res.type('html')
  if (req.loginUser) {
    var comment = db.prepare('SELECT * FROM comments WHERE rowid = ?').get(req.params.commentId)

    if (comment) {
      //评论是自己发的
      if (comment.userId == req.loginUser.userId) {
        db.prepare('DELETE FROM comments WHERE rowid = ?').run(req.params.commentId)
        res.end('删除成功')

      } else { // 评论是发在自己的帖子下面
        var post = db.prepare('SELECT * FROM posts WHERE rowid = ?').get(comment.postId)

        if (post.userId == req.loginUser.userId) {
          db.prepare('DELETE FROM comments WHERE rowid = ?').run(req.params.commentId)
          res.end('删除成功')
        } else {
          res.status(401).end('无权删除')
        }
      }
    } else {
      res.end('评论不存在')
    }
  } else {
    res.end('未登录')
  }
})

app.get('/logout',(req,res,next) => {   // 登出
  var returnUrl = req.get('referer') ?? '/'
  res.clearCookie('loginName')  // 清除cookie
  res.redirect(returnUrl)         // 重新回到首页
})










app.listen(port,() => {
  console.log('listening on' ,port);
})
  // address 返回操作系统报告的绑定 address、地址 family 名称和套接字的 port
