const express = require('express')

const port = 8080

const app = express()


app.use((req,res,next) => {
  console.log(req.method,req.url)
  next()
})

app.listen(pore,() => {
  console.log('listening on' ,app.address());  // address 返回操作系统报告的绑定 address、地址 family 名称和套接字的 port
})
