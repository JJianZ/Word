http://localhost:8080/   首页

http://localhost:8080/register  注册
http://localhost:8080/login   登录
http://localhost:8080/forget    忘记密码

http://localhost:8080/post/235  帖子

http://localhost:8080/post/user/zhang 用户

// http basic 验证的服务端代码
app.get('/foo', (req, res, next) => {
  var auth
  if (auth = req.get('Authorization')) {
    var info = atob(auth.split(' ')[1])
    var [name, pass] = info.split(':')

    if (name == 'miao' && pass == '6789') {
      res.end('hello')
    } else {
      res.status(401)
      res.set('WWW-Authenticate', 'Basic realm="please..."')
      res.end()
    }
  } else {
    res.status(401)
    res.set('WWW-Authenticate', 'Basic realm="please..."')
    res.end()
  }
})

==============================
POST /login

name=miao&pass=6789   // 请求体
==============================
HTTP/1.1 200 OK
Set-Cookie: (内容):user=miao (限制) ;Expire=202292384923(到期时间);Path=/; Secure(只会在安全连接中发送); HttpOnly(无法通过前端服务器读到); SameSite=Lax
Set-Cookie: login=yes; Expire=202292384923; Path=/; Secure; HttpOnly; SameSite=Lax
==============================
GET /posts
Cookies: user=miao; login=yes
==============================
HTTP/1.1 200 OK

content..............
==============================
==============================
GET /post/5
Cookies: user=miao; login=yes
==============================
HTTP/1.1 200 OK

content..............
==============================
