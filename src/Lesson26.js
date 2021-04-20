/**
 * Lesson26-FBO的实现-实现画中画效果，数据存到自定义FBO，在原生FBO中直接渲染
 * @Author: lzmxqh 
 * @Date: 2021-04-20 23:51:01 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-04-21 02:29:01
 */
/**顶点着色器 */ 
var vs = `
    attribute vec3 v3Position;
    attribute vec4 inColor;
    attribute vec2 inUV;
    uniform mat4 proj;
    varying vec4 outColor;
    varying vec2 outUV;
    void main() {
        gl_Position = proj * vec4(v3Position, 1.0);
        outColor = inColor;
        outUV = inUV;
    }
`;

/**片段着色器 */ 
var fs = `
    precision mediump float;
    varying vec4 outColor;
    varying vec2 outUV;
    uniform sampler2D texture;
    void main() {
        gl_FragColor = texture2D(texture, outUV) * outColor;
    }
`;

var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;
var triangleBuffer = null;

var v3PositionIndex = 0;
var attrColor = 0;
var attrUV = 0;

var uniformProj = 0;
var uniformTexture = 0;
var textureHandle = null;

// 动态存储ColorBuffer
var textureDynamic = null;
// fbo包含颜色，深度，模板缓冲区
var fbo;

var mat4 = glMatrix.mat4;
var projectMat = mat4.create();
var orthoMat = mat4.create();

var texWidth = 0;
var texHeight = 0;

var rPyramid = 0;
var varTransZ = -5;
var varTransX = 0;
var varRot = 45;
var varScale = 1;

function handleKeyDown(event) {
    if (String.fromCharCode(event.keyCode) == "W") {
        varTransZ -= 1;
    } else if (String.fromCharCode(event.keyCode) == "S") {
        varTransZ += 1;
    } else if (String.fromCharCode(event.keyCode) == "A") {
        varTransX -= 1;
    } else if (String.fromCharCode(event.keyCode) == "D") {
        varTransX += 1;
    } else if (String.fromCharCode(event.keyCode) == "R") {
        varRot += 1;
    } else if (String.fromCharCode(event.keyCode) == "Z") {
        varScale += 0.1;
    } else if (String.fromCharCode(event.keyCode) == "X") {
        varScale -= 0.1;
    }
}

function handleKeyUp(event) {
    
}

function onStart() {
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp; 
    // 初始化
    init();
    // 进入游戏循环
    onTick();
}

function init() {
    //获取canvas元素
    var canvas = document.getElementById('canvas');
    //获取绘制二维上下文
    webgl = canvas.getContext('webgl');
    webgl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    texWidth = canvas.clientWidth;
    texHeight = canvas.clientHeight;
    mat4.ortho(orthoMat, 0, canvas.clientWidth, canvas.clientHeight, 0, -1.0, 1.0);
    mat4.perspective(projectMat, 45, canvas.clientWidth / canvas.clientHeight, 0.1, 100.0);
        
    vertexShaderObject = webgl.createShader(webgl.VERTEX_SHADER);
    fragmentShaderObject = webgl.createShader(webgl.FRAGMENT_SHADER);

    webgl.shaderSource(vertexShaderObject, vs);
    webgl.shaderSource(fragmentShaderObject, fs);

    webgl.compileShader(vertexShaderObject);
    webgl.compileShader(fragmentShaderObject);

    if (!webgl.getShaderParameter(vertexShaderObject, webgl.COMPILE_STATUS)) {
        var err = webgl.getShaderInfoLog(vertexShaderObject);
        alert(err);
        return;
    }
    if (!webgl.getShaderParameter(fragmentShaderObject, webgl.COMPILE_STATUS)) {
        var err = webgl.getShaderInfoLog(fragmentShaderObject);
        alert(err);
        return;
    }
    programObject = webgl.createProgram();
    
    webgl.attachShader(programObject, vertexShaderObject);
    webgl.attachShader(programObject, fragmentShaderObject);

    webgl.linkProgram(programObject);
    if (!webgl.getProgramParameter(programObject, webgl.LINK_STATUS)) {
        var err = webgl.getProgramInfoLog(programObject);
        alert(err);
        return;
    }
    webgl.useProgram(programObject);

    webgl.bindAttribLocation(programObject, v3PositionIndex, "v3Position");

    uniformProj = webgl.getUniformLocation(programObject, "proj");
    uniformTexture = webgl.getUniformLocation(programObject, "texture");

    attrColor = webgl.getAttribLocation(programObject, "inColor");
    attrUV = webgl.getAttribLocation(programObject, "inUV");

    var boxVertex = [
        // 正面
        -1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,

        -1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0,

        // 背面
        -1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0,
        1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,

        -1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
        1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,

        // 顶部
        -1.0, 1.0, -1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,
        -1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0,

        -1.0, 1.0, -1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0,
        1.0, 1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0,

        // 底部
        -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0,
        1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,

        -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
        -1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,

        // 右面
        1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0,

        1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0,
        1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0,

        // 左面
        -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0,

        -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0,

        // 平面矩形
        0, 0, 0, 0.0, 0.0, 1, 1, 1, 1,
        300, 0, 0, 1.0, 0.0, 1, 1, 1, 1,
        300, 300, 0, 1.0, 1.0, 1, 1, 1, 1,

        0,0, 0, 0.0, 0.0, 1, 1, 1, 1,
        300, 300, 0, 1.0, 1.0, 1, 1, 1, 1,
        0, 300, 0, 0.0, 1.0, 1, 1, 1, 1,
    ];
    
    triangleBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(boxVertex), webgl.STATIC_DRAW); 

    // chrome软件目标路径加上 --allow-file-access-from-files
    textureHandle = initTexture("./res/1.jpg");
    
    fbo = createFBO(canvas.clientWidth, canvas.clientHeight);
}

function createFBO(width, height) {
    var obj = webgl.createFramebuffer();
    webgl.bindFramebuffer(webgl.FRAMEBUFFER, obj);

    var depthObj = webgl.createRenderbuffer();
    webgl.bindRenderbuffer(webgl.RENDERBUFFER, depthObj);
    webgl.renderbufferStorage(webgl.RENDERBUFFER, webgl.DEPTH_COMPONENT16, width, height)

    // 绑定深度缓冲区
    webgl.framebufferRenderbuffer(webgl.FRAMEBUFFER, webgl.DEPTH_ATTACHMENT, webgl.RENDERBUFFER, depthObj);

    textureDynamic = createDynamicTexture(width, height);

    // 绑定颜色缓冲区
    webgl.framebufferTexture2D(webgl.FRAMEBUFFER, webgl.COLOR_ATTACHMENT0, webgl.TEXTURE_2D, textureDynamic, 0);

    webgl.bindRenderbuffer(webgl.RENDERBUFFER, null);
    webgl.bindFramebuffer(webgl.FRAMEBUFFER, null);
    webgl.bindTexture(webgl.TEXTURE_2D, null);
    return obj;
}

function createDynamicTexture(width, height) {
    var texture = webgl.createTexture();
    webgl.bindTexture(webgl.TEXTURE_2D, texture);
    webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, width, height, 0, webgl.RGBA, webgl.UNSIGNED_BYTE, null);

    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.LINEAR);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.LINEAR);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);

    return texture;
}

function initTexture(imageFile) {
    // 创建一个纹理 webgl
    var texture = webgl.createTexture();
    // 创建一个图片
    texture.image = new Image();
    // 指定图片的路径
    texture.image.src = imageFile;
    texture.image.onload = function() {
        handleLoadedTexture(texture);
    }
    return texture;
}

function handleLoadedTexture(texture) {
    webgl.bindTexture(webgl.TEXTURE_2D, texture);
    
    webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, texture.image);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.LINEAR);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.LINEAR);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);

    webgl.bindTexture(webgl.TEXTURE_2D, null);
}

function degToRad(degree) {
    return degree * Math.PI / 180;
}

function renderToFBO() {
    // 使用自定义FBO
    webgl.bindFramebuffer(webgl.FRAMEBUFFER, fbo);
    webgl.viewport(0, 0, texWidth, texHeight);

    // 设置重绘背景的颜色
    webgl.clearColor(1.0, 1.0, 1.0, 1.0);
    // 执行绘制，即将背景清空成指定的颜色(clearColor)
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    webgl.enable(webgl.DEPTH_TEST);
    // 指定绘制所使用的顶点数据 从 缓冲区中获取
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);

    var mvp = mat4.create();
    var matTrans = mat4.create();
    var matRot = mat4.create();
    var matScale = mat4.create();
    var matModel = mat4.create();
    var matAll = mat4.create();

    mat4.identity(matTrans);
    mat4.identity(matRot);
    mat4.identity(matScale);
    mat4.identity(matModel);
    mat4.identity(matAll);

    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D,textureHandle);
    webgl.uniform1i(uniformTexture, 0);

    mat4.translate(matTrans, matTrans, [varTransX, 0.0, varTransZ]);
    mat4.rotate(matRot, matRot, degToRad(varRot), [1.0, 1.0, 1.0]);
    mat4.scale(matScale, matScale, [varScale, 1, 1]);

    mat4.multiply(matModel, matTrans, matRot);

    mat4.multiply(matAll, matModel, matScale);

    mat4.multiply(mvp, projectMat, matAll);

    webgl.uniformMatrix4fv(uniformProj, false, mvp);

    webgl.enableVertexAttribArray(v3PositionIndex);
    webgl.enableVertexAttribArray(attrColor);
    webgl.enableVertexAttribArray(attrUV);

    webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 9, 0);
    webgl.vertexAttribPointer(attrUV, 2, webgl.FLOAT, false, 4 * 9, 4 * 3);
    webgl.vertexAttribPointer(attrColor, 4, webgl.FLOAT, false, 4 * 9, 4 * 5);

    webgl.drawArrays(webgl.TRIANGLES, 0, 36);
}

function renderScene() {

    renderToFBO();

    // 使用原生FBO
    webgl.bindFramebuffer(webgl.FRAMEBUFFER, null);
    webgl.viewport(0, 0, texWidth, texHeight);

    // 设置重绘背景的颜色
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    // 执行绘制，即将背景清空成指定的颜色(clearColor)
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    webgl.enable(webgl.DEPTH_TEST);
    // 指定绘制所使用的顶点数据 从 缓冲区中获取
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);

    var mvp = mat4.create();
    var matTrans = mat4.create();
    var matRot = mat4.create();
    var matScale = mat4.create();
    var matModel = mat4.create();
    var matAll = mat4.create();

    mat4.identity(matTrans);
    mat4.identity(matRot);
    mat4.identity(matScale);
    mat4.identity(matModel);
    mat4.identity(matAll);

    varRot += 1;
    
    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D, textureDynamic);
    webgl.uniform1i(uniformTexture, 0);

    mat4.translate(matTrans, matTrans, [varTransX, 0.0, varTransZ]);
    mat4.rotate(matRot, matRot, degToRad(varRot), [1.0, 1.0, 1.0]);
    mat4.scale(matScale, matScale, [varScale, 1, 1]);

    mat4.multiply(matModel, matTrans, matRot);

    mat4.multiply(matAll, matModel, matScale);

    mat4.multiply(mvp, projectMat, matAll);

    webgl.uniformMatrix4fv(uniformProj, false, mvp);

    webgl.enableVertexAttribArray(v3PositionIndex);
    webgl.enableVertexAttribArray(attrColor);
    webgl.enableVertexAttribArray(attrUV);

    webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 9, 0);
    webgl.vertexAttribPointer(attrUV, 2, webgl.FLOAT, false, 4 * 9, 4 * 3);
    webgl.vertexAttribPointer(attrColor, 4, webgl.FLOAT, false, 4 * 9, 4 * 5);

    webgl.drawArrays(webgl.TRIANGLES, 0, 36);
}

function onTick() {
    requestAnimFrame(onTick);
    renderScene();
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
})();


window.onload = onStart();