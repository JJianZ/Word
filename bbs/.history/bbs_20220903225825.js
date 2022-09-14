const express = require('express')
const fs = require('fs')


const port = 8080

const app = express()


app.use((req,res,next) => {
  console.log(req.method,req.url)
  next()
})

const users = JSON.parse(fs.readFileSync('./users.json'))   // 存储用户信息的文件 只是拿到了源代码 要解析成对象

app.use(express.urlencoded({extended:true}))  // 能够解析扩展express url的请求体 结果放在req的body上

app.get('/', (req,res,next) => {  // get首页
  res.type('html')
  res.end(`
    <div><a href="/">homepage</a></div>
    <div><a href="/register">register</a></div>
    <div><a href="/login">login</a></div>
    <div><a href="/logout">logout</a></div>
  `)
})

app.get('/register', (req,res,next) => {   // 注册页面
  res.type('html')
  res.end(`
    <h1>注册</h1>
    <form action="/register" method="post">
      <div>用户名:<input type="text" name="name">
      <span name="title"></span></div>
      <div>邮箱:<input type="email" name="email"></div>
      <div>密码:<input type="password" name="password"></div>
      <div>确认密码:<input type="password" name="password1"></div>
      <button>注册</button>
    </form>
  `)
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
  }
  if (users.some(it => it.name == regInfo.name)) {
    res.end('用户名已存在')
  }
  if (users.some(it => it.email == regInfo.email)) {
    res.end('邮箱已存在')
  }

  fs.writeFileSync('./users.json',JSON.stringify(users,null,2))


})


app.get('/login',(req,res,next) => {   // 登录页面
  res.type('html')
  res.end(`
    <h1>登录</h1>
    <form action="/login" method="post">
      <div>用户名:<input type="text" name="name"></div>
      <div>密码:<input type="password" name="password"></div>
      <button>登录</button>
    </form>
  `)
})

app.post('/login',(req,res,next) => {   // 判断是否登录成功
  res.type('html')
  let loginInfo = req.body

})

















app.listen(port,() => {
  console.log('listening on' ,port);
})
  // address 返回操作系统报告的绑定 address、地址 family 名称和套接字的 port
