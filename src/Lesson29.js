/**
 * Lesson29-实现第一人称摄像机控制
 * 如何拾取，选择三维中的物体，射线的学习
 * 1. 坐标转换，将屏幕坐标转化为三维的坐标
 * 2. 射线法
 * 3. 包围盒
 * @Author: lzmxqh 
 * @Date: 2021-04-22 22:46:02 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-04-23 01:23:57
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
        gl_FragColor = texture2D(texture, outUV);
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
// 绘制地面适用的纹理句柄
var textureGround;

// 动态存储ColorBuffer
var textureDynamic = null;
// fbo包含颜色，深度，模板缓冲区
var fbo;

var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;
var projectMat = mat4.create();
var viewMat = mat4.create();

var cameraEye = new Float32Array(3);
var cameraCenter = new Float32Array(3);
var cameraUp = new Float32Array(3);
var cameraLookAt = new Float32Array(3);

var texWidth = 0;
var texHeight = 0;

var varTransZ = -4;
var varTransX = 0;

var varRotX = 0;
var varRotY = 0;

var varRotFBOX = 0;
var varRotFBOY = 0;

var mouseDownLeft = false;
var mouseDownRight = false;

var lastMouseX = 0;
var lastMouseY = 0;

function handleMouseDown(event) {
    if (event.button){
        mouseDownRight = true;
    } else {
        mouseDownLeft = true;
    }
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseDownLeft = false;
    mouseDownRight = false;
}

function handleMouseMove(event) {
    if (!mouseDownLeft && !mouseDownRight) {
        return;
    }
    var offsetX = event.clientX - lastMouseX;
    var offsetY = event.clientY - lastMouseY;

    if (mouseDownLeft) {
        varRotFBOX += offsetX;
        varRotFBOY += offsetY;
    } else {
        varRotX += offsetX;
        varRotY += offsetY;
    }

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleKeyDown(event) {
    if (String.fromCharCode(event.keyCode) == "W") {
        cameraEye[0] += cameraLookAt[0] * 2;
        cameraEye[1] += 0;
        cameraEye[2] += cameraLookAt[2] * 2;

        cameraCenter[0] = cameraEye[0] + cameraLookAt[0] * 2;
        cameraCenter[1] = cameraEye[1] + 0;
        cameraCenter[2] = cameraEye[2] + cameraLookAt[2] * 2;
    } else if (String.fromCharCode(event.keyCode) == "S") {
        cameraEye[0] -= cameraLookAt[0] * 2;
        cameraEye[1] -= 0;
        cameraEye[2] -= cameraLookAt[2] * 2;

        cameraCenter[0] = cameraEye[0] + cameraLookAt[0] * 2;
        cameraCenter[1] = cameraEye[1] + 0;
        cameraCenter[2] = cameraEye[2] + cameraLookAt[2] * 2;
    } else if (String.fromCharCode(event.keyCode) == "A") {
        var right = vec3.create();
        vec3.cross(right, cameraUp, cameraLookAt);
        right[0] *= 2;
        right[1] *= 2;
        right[2] *= 2;

        cameraEye[0] += right[0];
        cameraEye[1] += right[1];
        cameraEye[2] += right[2];

        cameraCenter[0] += right[0];
        cameraCenter[1] += right[1];
        cameraCenter[2] += right[2];
    } else if (String.fromCharCode(event.keyCode) == "D") {
        var right = vec3.create();
        vec3.cross(right, cameraUp, cameraLookAt);
        right[0] *= -2;
        right[1] *= -2;
        right[2] *= -2;

        cameraEye[0] += right[0];
        cameraEye[1] += right[1];
        cameraEye[2] += right[2];

        cameraCenter[0] += right[0];
        cameraCenter[1] += right[1];
        cameraCenter[2] += right[2];
    }
}

function handleKeyUp(event) {
    
}

function onStart() {
    // 初始化
    var canvas = init();
    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove; 

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

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

    cameraEye[0] = 10;
    cameraEye[1] = 0;
    cameraEye[2] = 10;

    cameraCenter[0] = 0;
    cameraCenter[1] = 0;
    cameraCenter[2] = 0;

    cameraUp[0] = 0;
    cameraUp[1] = 1;
    cameraUp[2] = 0;

    vec3.subtract(cameraLookAt, cameraCenter, cameraEye);
    vec3.normalize(cameraLookAt, cameraLookAt);

    mat4.perspective(projectMat, 45, canvas.clientWidth / canvas.clientHeight, 0.1, 100.0);

    mat4.lookAt(viewMat, cameraEye, cameraCenter, cameraUp);
        
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

    // 绘制地面的数据
    var gSize = 100;
    var gPos = -10;
    var rept = 20;

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
        -1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,
        1.0, -1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0,

        -1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,
        1.0, -1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0,
        -1.0, -1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0,

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

        -gSize, gPos, -gSize, 0.0, 0.0, 1.0, 1.0, 1.0, 1,0,
        gSize, gPos, -gSize, rept, 0.0, 1.0, 1.0, 1.0, 1,0,
        gSize, gPos, gSize, rept, rept, 1.0, 1.0, 1.0, 1,0,

        -gSize, gPos, -gSize, 0.0, 0.0, 1.0, 1.0, 1.0, 1,0,
        gSize, gPos, gSize, rept, rept, 1.0, 1.0, 1.0, 1,0,
        -gSize, gPos, gSize, 0.0, rept, 1.0, 1.0, 1.0, 1,0,
    ];
    
    triangleBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(boxVertex), webgl.STATIC_DRAW); 

    // chrome软件目标路径加上 --allow-file-access-from-files
    textureHandle = initTexture("./res/1.jpg");
    textureGround = initTexture("./res/1.jpg");
    
    fbo = createFBO(canvas.clientWidth, canvas.clientHeight);

    return canvas;
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
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.REPEAT);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.REPEAT);

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
    var matRotX = mat4.create();
    var matRotY = mat4.create();
    var matRot = mat4.create();
    var matModel = mat4.create();

    mat4.identity(matTrans);
    mat4.identity(matRotX);
    mat4.identity(matRotY);
    mat4.identity(matRot);
    mat4.identity(matModel);

    // varRotFBO += 1;

    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D, textureHandle);
    webgl.uniform1i(uniformTexture, 0);

    mat4.translate(matTrans, matTrans, [varTransX, 0.0, varTransZ]);
    mat4.rotate(matRotX, matRotX, degToRad(varRotFBOX), [0.0, 1.0, 0.0]);
    mat4.rotate(matRotY, matRotY, degToRad(varRotFBOY), [1.0, 0.0, 0.0]);

    mat4.multiply(matRot, matRotY, matRotX);
    mat4.multiply(matModel, matTrans, matRot);
    mat4.multiply(mvp, projectMat, matModel);

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

    mat4.lookAt(viewMat, cameraEye, cameraCenter, cameraUp);

    varRotFBOX += 1;

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
    var matRotX = mat4.create();
    var matRotY = mat4.create();
    var matRot = mat4.create();
    var matTemp = mat4.create();
    var matModel = mat4.create();

    mat4.identity(matTrans);
    mat4.identity(matRotX);
    mat4.identity(matRotY);
    mat4.identity(matRot);
    mat4.identity(matTemp);
    mat4.identity(matModel);

    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D, textureDynamic);
    webgl.uniform1i(uniformTexture, 0);

    mat4.translate(matTrans, matTrans, [0, 0.0, 0]);
    mat4.rotate(matRotX, matRotX, degToRad(varRotFBOX), [0.0, 1.0, 0.0]);
    mat4.rotate(matRotY, matRotY, degToRad(varRotFBOY), [1.0, 0.0, 0.0]);

    mat4.multiply(matRot, matRotY, matRotX);
    mat4.multiply(matModel, matTrans, matRot);

    mat4.multiply(matTemp, projectMat, viewMat);
    mat4.multiply(mvp, matTemp, matModel);

    webgl.uniformMatrix4fv(uniformProj, false, mvp);

    webgl.enableVertexAttribArray(v3PositionIndex);
    webgl.enableVertexAttribArray(attrColor);
    webgl.enableVertexAttribArray(attrUV);

    webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 9, 0);
    webgl.vertexAttribPointer(attrUV, 2, webgl.FLOAT, false, 4 * 9, 4 * 3);
    webgl.vertexAttribPointer(attrColor, 4, webgl.FLOAT, false, 4 * 9, 4 * 5);

    webgl.drawArrays(webgl.TRIANGLES, 0, 36);

    mat4.multiply(mvp, projectMat, viewMat);
    webgl.uniformMatrix4fv(uniformProj, false, mvp);
    webgl.bindTexture(webgl.TEXTURE_2D, textureGround);
    
    webgl.drawArrays(webgl.TRIANGLES, 36, 6);
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