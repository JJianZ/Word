const http = require('http')
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const server = http.createServer()
const mime = require('mime')

const port = 8899
const baseDir = '..\\Work'  // 基础文件夹

server.on('request',async (req,res) => {
  req.url = path.posix.join(req.url)    // 化简请求路径

  var urlObj = new URL(`http://xxx${req.url}`)

  const targetPath = path.join(baseDir,decodeURIComponent(urlObj.pathname))    // 拼接基础文件夹地址和请求地址

  if (!targetPath.startsWith(baseDir)) {   // 不以基础文件夹为开头的话 说明中不在这个文件夹内
    res.writeHead(404)
    res.write('404 Not Found')
    res.end()
    return
  }

  try {
    let stat = await fsp.stat(targetPath)    // fsp.stat获取文件信息 目标路径
    if (stat.isFile()) {    // 如果目标路径的状态是文件
      // var data = await fsp.readFile(targetPath)   // 读取文件内容并响
      // var extname = path.extname(targetPath)     // 路径处理 完整路径的扩展名

      var readable = fs.createReadStream(targetPath)   // 创建可读流
      readable.pipe(res)
      // readable.on('data',data => {   // 如果可读流中有数据 写进可写流中 data是事件
      //   res.write(data)       // data是方法
      // })
      // readable.on('end' ,() => {  // end是事件
      //   res.end()       // end是方法
      // })
      // res.write(data)
      // res.end()

      res.writeHead(200,{
        'Content-Type': mime.getType(targetPath)
      })
      res.write(data)
      res.end()

    } else if(stat.isDirectory()){
      if(urlObj.pathname.at(-1) == '/') {   // 最后一个符号为/的话
        var indexPath = path.join(targetPath,'index.html')   // 目标文件

        try {
          let indexStat = await fsp.stat(indexPath) // 读取文件状态，如果不存在则会抛出

          if (indexStat.isFile()) { // 路径存在，并且是文件
            var indexContext = await fsp.readFile(indexPath)
            res.writeHead(200, {
              'Content-Type' : 'text/html;charset=UTF-8'
            })
            res.write(indexContext)
            res.end()

          } else { // 不是文件，则抛出
            throw 'index is not a file'
          }
        } catch(e) { // 文件不存在，列出文件夹列表
          var entries = await fsp.readdir(targetPath,{withFileTypes:true})  // 获取文件夹内的文件
          res.writeHead(200, {
            'Content-Type' : 'text/html;charset=UTF-8'
          })
          res.write('<ul style=" margin: auto; list-style: none;display: flex;flex-direction: column;   justify-content: flex-start;  flex-wrap: wrap;flex-grow: 1; height: 500px;  width: 500px; ; border: 1px solid black; overflow: scroll;">')

          res.write(`<li><a href="../" style="  text-decoration: none;">../返回上级菜单</a></li>`)   //返回上层文件夹
          for(let entry of entries) {
            var slash = entry.isDirectory() ? '/' : ''     // 是否是文件夹 如果是在路径后面加/ 不是就不加

            // posix使用linux的方式来操作路径 就是/正斜杠
            res.write(`<li><a style="  text-decoration: none;" href="${path.posix.join(urlObj.pathname,entry.name)}${slash}">${entry.name}${slash}</a></li>`)     // 每个文件的名字
          }
          res.write('</ul>')
          res.end()
        }

      } else {
        res.writeHead(302,{
          Location: `http://${req.headers.host}${urlObj.pathname}/${urlObj.search}/`  // urlObj.search 地址?后面的部分
        })
        res.end()
      }
    } else {
      throw 'not and file or directory'
    }
  } catch(e) {  //如果文件不存在
    console.log(e)
    res.writeHead(404)
    res.write(String(e))
    res.end()
  }


})


server.listen(port,() => {
  console.log('listening on port',port);

})


// 根据扩展名  请求头
const mimeMap = {
  '.html': 'text/html;charset=UTF-8',
  '.css': 'text/css;charset=UTF-8',
  '.js': 'application/javascript;charset=UTF-8',
  '.json': 'application/json;charset=UTF-8',
  '.txt': 'text/html;charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/xml+svg'
}
function getMimeType(extname) {
  return mimeMap[extname] ?? 'stream/octet-stream'
}
