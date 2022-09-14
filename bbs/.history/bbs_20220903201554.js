const express = require('express')

const port = 8080

const app = express()


app.use((req,res,next) => {
  console.log(req.method,req.url)
  next()
})


app.get('/', (req,res,next) => {  // get首页

})

app.get('/register', (req,res,next) => {   // 注册页面
  res.end(`
    <form action="???" method="post">
      <div>用户名:<input type="text" name="name"></div>
      <div>邮箱:<input type="email" name="email"></div>
      <div>密码:<input type="password" name="password"></div>
      <div>确认密码:<input type="password" name="password1"></div>
    </form>
  `)
})





















app.listen(port,() => {
  console.log('listening on' ,app.address());  // address 返回操作系统报告的绑定 address、地址 family 名称和套接字的 port
})
