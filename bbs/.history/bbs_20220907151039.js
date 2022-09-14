const express = require('express')
const fs = require('fs')
const cookieParser = require('cookie-parser')
const uuid = require('uuid').v4
const svgCaptcha = require('svg-captcha')

const port = 8080

const app = express()

app.locals.pretty = true    // 让pug输出格式化过的html代码
app.set('views',__dirname + '/tamplates')  // 设置模板文件夹为tamplates


app.use(express.static(__dirname + '/assets'))


const users = JSON.parse(fs.readFileSync('./users.json'))   // 存储用户信息的文件 只是拿到了源代码 要解析成对象
const posts = JSON.parse(fs.readFileSync('./posts.json'))   // 存储帖子信息
const comments = JSON.parse(fs.readFileSync('./comments.json'))   // 存储评论

app.use(express.urlencoded({extended:true}))  // 能够解析扩展express url的请求体 结果放在req的body上

app.use(cookieParser('asdasasd'))    // 生成签名的种子

// app.use((req,res,next) => {
//   console.log(req.cookies,req.signedCookies)  // 读取cookie  signedCookies将签名后的cookies转换成原始内容存入
//   next()
// })

var sessionObjects = {}
app.use(function sessionMW(req,res,next) {   // 通过会话框的id来判断页面 同一个会话的sessionId相同 根据sessionId判断是否是同一个浏览器
  if (!req.cookies.sessionId) {  // 如果请求中没有sessionId 生成
    var sessionId = uuid()
    res.cookie('sessionId',sessionId)  // 下发
    req.cookies.sessionId = sessionId
  }

  req.session = sessionObjects[req.cookies.sessionId] ?? (sessionObjects[req.cookies.sessionId] = { })
  next()
})

app.get('/', (req,res,next) => {  // get首页
  res.type('html')
  res.render('index.pug',{  // 使用模板文件 路径和在前面已经声明了 第二个参数为给模板的数据
    posts: posts,
    loginName: req.signedCookies.loginName,
  })
})

app.get('/register', (req,res,next) => {   // 注册页面
  res.type('html')
  res.render('register.pug')
})

app.post('/register',(req,res,next) => {   // 判断用户名,邮箱是否存在 ,两次密码是不是一致
  res.type('html')
  let regInfo = req.body  // 注册信息
  if (regInfo.password !== regInfo.password1) {
    res.end('两次密码输入错误,请重新输入')
    return
  }

  var user = {     // 存储用户信息
    name: regInfo.name,
    email: regInfo.email,
    password: regInfo.password
  }

  let reg = /^[\w]{1}[\w\\d]{5,10}/i // 用户名长度6-10位，由数字，字母，下划线组成，且不能以数字开头，字母不区分大小写。
  if (reg.test(regInfo.name)) {
    res.end('注册成功,go<a href="/login">登录</a>')
    users.push(user)
  } else {
    res.end('用户名长度6-10位，由数字，字母，下划线组成，且不能以数字开头，字母不区分大小写。')
  }

  if (regInfo.password !== regInfo.password1) {
    res.end('两次密码输入不一致')
    return
  }
  if (users.some(it => it.name == regInfo.name)) {
    res.end('用户名已存在')
    return
  }
  if (users.some(it => it.email == regInfo.email)) {
    res.end('邮箱已存在')
    return
  }

  fs.writeFileSync('./users.json',JSON.stringify(users,null,2))


})

app.get('/login',(req,res,next) => {   // 登录页面
  res.type('html')
  var returnUrl = req.get('referer') ?? '/'

  res.render('login.pug',{
    returnUrl: returnUrl,
    session: req.session,
  })

  req.session.刚刚登录失败的原因 = null
})

app.post('/login',(req,res,next) => {   // 判断是否登录成功
  res.type('html')
  var loginInfo = req.body

  var returnUrl = req.query.next ?? '/'    // req的query可以读到url中的querystring

  if (req.session.loginFailCount >= 3 &&  req.body.captcha !== req.session.captcha) {
    req.session.刚刚登录失败的原因 = '验证码错误'
    res.redirect('/login')
    return
  }

  var target = users.find(it => it.name == loginInfo.name && it.password == loginInfo.password)  // 在users库中匹配用户名和密码


  if (target) {
    res.cookie('loginName',target.name,{
      maxAge:86400000,    // 最大有效期
      signed:true,      //签名之后发送
    })
    req.session.loginFailCount = 0    // 登录成功 登录错误次数重新归零
    res.redirect(returnUrl)    // 返回首页
  } else {  // 匹配不上
    req.session.loginFailCount = (req.session.loginFailCount ?? 0) + 1  //登录失败的次数
    req.session.刚刚登录失败的原因 = '用户名或密码错误'
    res.redirect('/login')
  }
})
// app.post('/login',(req,res,next) => {   // 判断是否登录成功
//   res.type('html')
//   let loginInfo = req.body

//   var returnUrl = req.query.next ?? '/'    // req的query可以读到url中的querystring 地址栏login/ 后面的内容


//   var target = users.find(it => it.name == loginInfo.name && it.password == loginInfo.password)  // 在users库中匹配用户名和密码

//   if(target) {
//     res.cookie('loginName',target.name,{
//       maxAge:86400000,    // 最大有效期 以秒为单位
//       signed:true,      //签名之后发送
//     })
//     req.session.loginFailCount = 0    // 登录成功 登录错误次数重新归零
//     res.redirect(returnUrl)    // 返回首页

//   } else {
//     req.session.loginFailCount = (req.session.loginFailCount ?? 0) + 1  //登录失败的次数
//     req.session.刚刚登录失败的原因 = '用户名或密码错误'
//     res.redirect('/login')
//   }
// })

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
  var userName = req.params.userName
  var user = users.find(it => it.name == userName)

  if (user) {
    res.write(`
      <img class="avatar" src="xxx">
      <h2>${userName}</h2>
      <hr>
      <h3>发过的帖子</h3>
    `)

    // 发过的帖子
    var thisPosts = posts.filter(it => it.owner == userName)

    for (var post of thisPosts) {
      res.write(`
        <div>
          <a href="/post/${post.id}">${post.title}</a>
        </div>
      `)
    }

    // 回复过的评论
    res.write(`
      <h3>回复过的帖子</h3>
    `)
    var thisComments = comments.filter(it => it.owner == userName)
    for (var comment of thisComments) {
      res.write(`
        <div>
          <a href="/post/${comment.postId}">标题</a>
          <br>
          ${comment.content}
          <hr>
        </div>
      `)
    }
  } else {
    res.end('查无此人')
  }
})

app.get('/add-post', (req, res, next) => { // 发帖页面
  res.type('html')
  res.render('add-post.pug',{
    loginName: req.signedCookies.loginName
  })
})

app.post('/add-post', (req, res, next) => { // 根据用户名发帖
  res.type('html')
  if (req.signedCookies.loginName) {  // 签了名的用户 当前用户的用户名
    var postInfo = req.body

    var post = {
      id: uuid(),
      title: postInfo.title,
      content: postInfo.content,
      createdAt: new Date().toISOString(),
      owner: req.signedCookies.loginName,
    }

    posts.push(post)
    res.end('发帖成功')
  } else {
    res.end('登录后才能发帖')
  }
  fs.writeFileSync('./posts.json',JSON.stringify(posts,null,2))
})

app.get('/post/:id',(req,res,next) => {   // 发帖人信息和发帖 以及评论 评论人信息
  res.type('html')
  let postId = req.params.id     // 当前帖子id
  let post = posts.find(it => it.id == req.params.id)

  if (post) {
    const thisComments = comments.filter(it => it.postId == postId)
    res.render('post.pug',{
      post: post,
      comments: thisComments,
      loginName: req.signedCookies.loginName
    })
  } else {
    res.render('404.pug')
  }
})

app.post('/comment/:postId',(req,res,next) => {  // 评论人信息
  res.type('html')
  var commentInfo = req.body
  var postId = req.params.postId

  if (req.signedCookies.loginName) {
    var comment = {
      id: uuid(),
      content: commentInfo.content,   // 帖子内容
      createdAt: new Date().toISOString(),
      owner: req.signedCookies.loginName,   // 用户id
      postId: postId,   // 帖子id
    }

    comments.push(comment)
    res.redirect(`/post/${postId}`)

  } else {
    red.end('请先登录在评论')
  }

  fs.writeFileSync('./comments.json',JSON.stringify(comments,null,2))
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

