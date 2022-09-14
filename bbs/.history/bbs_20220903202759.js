const express = require('express')

const port = 8080

const app = express()


app.use((req,res,next) => {
  console.log(req.method,req.url)
  next()
})


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
      <div>用户名:<input type="text" name="name"></div>
      <div>邮箱:<input type="email" name="email"></div>
      <div>密码:<input type="password" name="password"></div>
      <div>确认密码:<input type="password" name="password1"></div>
    </form>
  `)
})





















app.listen(port,() => {
  console.log('listening on' ,port);
})
  // address 返回操作系统报告的绑定 address、地址 family 名称和套接字的 port
