/**
 * Lesson35-光照-真实的三维世界-点光源
 * @Author: lzmxqh 
 * @Date: 2021-05-09 15:02:06 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-05-09 15:40:16
 */
/**顶点着色器 */ 
var vs = `
    attribute vec3 v3Position;
    attribute vec4 inColor;
    attribute vec2 inUV;
    attribute vec3 inNormal;
    uniform mat4 proj;
    uniform mat3 normalMat;
    uniform mat4 mvMat;
    uniform vec3 lightPos;
    uniform vec3 ambientColor;
    uniform vec3 lightColor;
    varying vec4 outColor;
    varying vec2 outUV;
    void main() {
        vec4 mvPosition = mvMat * vec4(v3Position, 1.0);
        vec3 lightDir = normalize(lightPos - mvPosition.xyz);
        vec3 transformedNormal = normalMat * inNormal;
        float lightWeight = max(dot(transformedNormal, lightDir), 0.0);

        gl_Position = proj * vec4(v3Position, 1.0);
        outColor = inColor * vec4(ambientColor + lightColor * lightWeight, 1.0);
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
        gl_FragColor = outColor * texture2D(texture, outUV);
    }
`;

var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;
var triangleBuffer = null;

var v3PositionIndex;
var attrColor;
var attrUV;
var attrNormal;

var uniformProj;
var uniformTexture;
var uniformNor;
var uniformMV;
var uniformAmbient;
var uniformLightPos;
var uniformLightColor;

var textureHandle;
// 绘制地面适用的纹理句柄
var textureGround;

// 动态存储ColorBuffer
var textureDynamic = null;
// fbo包含颜色，深度，模板缓冲区
var fbo;

var vec3 = glMatrix.vec3;
var mat3 = glMatrix.mat3;
var mat4 = glMatrix.mat4;
var projectMat = mat4.create();
var viewMat = mat4.create();

var cameraEye = new Float32Array(3);
var cameraCenter = new Float32Array(3);
var cameraUp = new Float32Array(3);
var cameraLookAt = new Float32Array(3);
// var cameraRight = new Float32Array(3);
var radius = 40;
var viewPortW = 0;
var viewPortH = 0;

var texWidth = 0;
var texHeight = 0;
var times = (new Date()).valueOf();

var role = {};
role._position = new Float32Array(3);
role._target = new Float32Array(3);
role._speed = 10;

var varRotFBOX = 0;
var varRotFBOY = 0;

var rButtonDown = false;
var lastMouseX = 0;

function handleMouseDown(event) {
    if (event.button == 0) {
        // 计算射线
        var minWorld = new Float32Array(3);
        var maxWorld = new Float32Array(3);

        var screen = new Float32Array(3);
        screen[0] = event.offsetX;
        screen[1] = event.offsetY;
        screen[2] = 0.0;

        var screen1 = new Float32Array(3);
        screen1[0] = event.offsetX;
        screen1[1] = event.offsetY;
        screen1[2] = 1.0;

        var minWorld = screenToWorld(screen);
        var maxWorld = screenToWorld(screen1);

        var dir = new Float32Array(3);
        dir[0] = maxWorld[0] - minWorld[0];
        dir[1] = maxWorld[1] - minWorld[1];
        dir[2] = maxWorld[2] - minWorld[2];
        vec3.normalize(dir, dir);

        // 计算时间
        var tm = Math.abs(minWorld[1] / dir[1]);
        var target = new Float32Array(3);
        target[0] = minWorld[0] + tm * dir[0];
        target[1] = minWorld[1] + tm * dir[1];
        target[2] = minWorld[2] + tm * dir[2];
        
        moveTo(target);
    } else {
        rButtonDown = true;
        lastMouseX = event.offsetX;
        console.log("rButtonDown = true;");
    }
}

function handleMouseUp(event) {
    rButtonDown = false;
}

function handleMouseMove(event) {
    if (!rButtonDown) {
        return;
    }
    console.log("handleMouseMove", offsetX);

    var offsetX = event.offsetX - lastMouseX;
    lastMouseX = event.offsetX;

    cameraLookAt = rotateY(cameraLookAt, offsetX);
}

function handleWheel(event) {
    if (event.wheelDelta > 0) {
        radius *= 1.1;
    } else {
        radius *= 0.9;
    }
}

function onStart() {
    // 初始化
    var canvas = init();
    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove;
    canvas.onwheel = handleWheel; 

    // 进入游戏循环
    onTick();
}

function init() {
    //获取canvas元素
    var canvas = document.getElementById('canvas');
    //获取绘制二维上下文
    webgl = canvas.getContext('webgl');
    webgl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    viewPortW = canvas.clientWidth;
    viewPortH = canvas.clientHeight;
    texWidth = canvas.clientWidth;
    texHeight = canvas.clientHeight;

    cameraEye[0] = 28.017817;
    cameraEye[1] = 29.867514;
    cameraEye[2] = 29.429590;

    cameraCenter[0] = -0.84969789;
    cameraCenter[1] = 1;
    cameraCenter[2] = 0.56207591;

    cameraUp[0] = 0;
    cameraUp[1] = 1;
    cameraUp[2] = 0;

    role._position[0] = 0;
    role._position[1] = 0;
    role._position[2] = 0;

    role._target[0] = 0;
    role._target[1] = 0;
    role._target[2] = 0;

    calcDir();

    mat4.perspective(projectMat, 45, canvas.clientWidth / canvas.clientHeight, 0.1, 10000.0);

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

    uniformProj = webgl.getUniformLocation(programObject, "proj");
    uniformTexture = webgl.getUniformLocation(programObject, "texture");
    uniformAmbient = webgl.getUniformLocation(programObject, "ambientColor");
    uniformLightPos = webgl.getUniformLocation(programObject, "lightPos");
    uniformLightColor = webgl.getUniformLocation(programObject, "lightColor");
    uniformNor = webgl.getUniformLocation(programObject, "normalMat");
    uniformMV = webgl.getUniformLocation(programObject, "mvMat");

    v3PositionIndex = webgl.getAttribLocation(programObject, "v3Position");
    attrColor = webgl.getAttribLocation(programObject, "inColor");
    attrUV = webgl.getAttribLocation(programObject, "inUV");
    attrNormal = webgl.getAttribLocation(programObject, "inNormal");

    webgl.uniform3f(uniformAmbient, 0.2, 0.2, 0.2);
    webgl.uniform3f(uniformLightColor, 1, 0, 0);
    webgl.uniform3f(uniformLightPos, 0, 0, -30.0);

    // 绘制地面的数据
    var gSize = 100;
    var gPos = -10;
    var rept = 20;

    var boxVertex = [
        // 正面
        -1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1,
        1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1,

        -1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1,
        -1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1,

        // 背面
        -1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, -1,
        -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, -1,
        1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, -1,

        -1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, -1,
        1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, -1,
        1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, -1,

        // 顶部
        -1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0,
        -1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0,
        1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0,

        -1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0,
        1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0,
        1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0,

        // 底部
        -1.0, -1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0, 0,
        1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0, 0,
        1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0, 0,

        -1.0, -1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0, 0,
        1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0, 0,
        -1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0, 0,

        // 右面
        1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0,
        1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0,
        1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0,

        1.0, -1.0, -1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0,
        1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0,
        1.0, -1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0,

        // 左面
        -1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, -1.0, 0.0, 0,
        -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, -1.0, 0.0, 0,
        -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 0.0, 0,

        -1.0, -1.0, -1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, -1.0, 0.0, 0,
        -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 0.0, 0,
        -1.0, 1.0, -1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 0.0, 0,

        -gSize, gPos, -gSize, 0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, 1.0, 0,
        gSize, gPos, -gSize, rept, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, 1.0, 0,
        gSize, gPos, gSize, rept, rept, 0.5, 0.5, 0.5, 0.5, 0.0, 1.0, 0,

        -gSize, gPos, -gSize, 0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, 1.0, 0,
        gSize, gPos, gSize, rept, rept, 0.5, 0.5, 0.5, 0.5, 0.0, 1.0, 0,
        -gSize, gPos, gSize, 0.0, rept, 0.5, 0.5, 0.5, 0.5, 0.0, 1.0, 0,
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
    var matMV = mat4.create();

    mat4.identity(matTrans);
    mat4.identity(matRotX);
    mat4.identity(matRotY);
    mat4.identity(matRot);
    mat4.identity(matModel);
    mat4.identity(matMV);

    // varRotFBO += 1;

    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D, textureHandle);
    webgl.uniform1i(uniformTexture, 0);

    mat4.translate(matTrans, matTrans, [0, 0.0, -4]);
    mat4.rotate(matRotX, matRotX, degToRad(varRotFBOX), [0.0, 1.0, 0.0]);
    mat4.rotate(matRotY, matRotY, degToRad(varRotFBOY), [1.0, 0.0, 0.0]);

    mat4.multiply(matRot, matRotY, matRotX);
    mat4.multiply(matModel, matTrans, matRot);
    mat4.multiply(mvp, projectMat, matModel);

    // 计算观察与模型矩阵
    mat4.multiply(matMV, viewMat, matModel);

    var normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, matMV);
    mat3.transpose(normalMatrix, normalMatrix);
    webgl.uniformMatrix3fv(uniformNor, false, normalMatrix);
    webgl.uniformMatrix4fv(uniformMV, false, matMV);

    webgl.uniformMatrix4fv(uniformProj, false, mvp);

    webgl.enableVertexAttribArray(v3PositionIndex);
    webgl.enableVertexAttribArray(attrColor);
    webgl.enableVertexAttribArray(attrUV);
    webgl.enableVertexAttribArray(attrNormal);

    webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 12, 0);
    webgl.vertexAttribPointer(attrUV, 2, webgl.FLOAT, false, 4 * 12, 4 * 3);
    webgl.vertexAttribPointer(attrColor, 4, webgl.FLOAT, false, 4 * 12, 4 * 5);
    webgl.vertexAttribPointer(attrNormal, 3, webgl.FLOAT, false, 4 * 12, 4 * 9);

    webgl.drawArrays(webgl.TRIANGLES, 0, 36);
}

/**将世界坐标转化为屏幕坐标 */
function worldToScreen(worldIn) {
    var world = new Float32Array(4);
    var screen = new Float32Array(4);
    var mvp = mat4.create();

    world[0] = worldIn[0];
    world[1] = worldIn[1];
    world[2] = worldIn[2];
    world[3] = 1.0;
    
    // 计算mvp矩阵
    mat4.multiply(mvp, projectMat, viewMat);
    // 将mvp * world
    mat4.multiply(screen, mvp, world);

    if (screen[3] == 0.0) {
        return false;
    }
    // 坐标设备化
    screen[0] /= screen[3];
    screen[1] /= screen[3];
    screen[2] /= screen[3];

    // map to range 0-1
    screen[0] = screen[0] * 0.5 + 0.5;
    screen[1] = screen[1] * 0.5 + 0.5;
    screen[2] = screen[2] * 0.5 + 0.5;

    // map to viewport
    screen[0] = screen[0] * viewPortW;
    screen[1] = viewPortH - (screen[1] * viewPortH);
    
    return screen;
}

function inverseEx(pData, resData) {
    var subFactor00 = pData[10] * pData[15] - pData[14] * pData[11];
    var subFactor01 = pData[9] * pData[15] - pData[13] * pData[11];
    var subFactor02 = pData[9] * pData[14] - pData[13] * pData[10];
    var subFactor03 = pData[8] * pData[15] - pData[12] * pData[11];
    var subFactor04 = pData[8] * pData[14] - pData[12] * pData[10];
    var subFactor05 = pData[8] * pData[13] - pData[12] * pData[9];
    var subFactor06 = pData[6] * pData[15] - pData[14] * pData[7];
    var subFactor07 = pData[5] * pData[15] - pData[13] * pData[7];
    var subFactor08 = pData[5] * pData[14] - pData[13] * pData[6];
    var subFactor09 = pData[4] * pData[15] - pData[12] * pData[7];
    var subFactor10 = pData[4] * pData[14] - pData[12] * pData[6];
    var subFactor11 = pData[5] * pData[15] - pData[13] * pData[7];
    var subFactor12 = pData[4] * pData[13] - pData[12] * pData[5];
    var subFactor13 = pData[6] * pData[11] - pData[10] * pData[7];
    var subFactor14 = pData[5] * pData[11] - pData[9] * pData[7];
    var subFactor15 = pData[5] * pData[10] - pData[9] * pData[6];
    var subFactor16 = pData[4] * pData[11] - pData[8] * pData[7];
    var subFactor17 = pData[4] * pData[10] - pData[8] * pData[6];
    var subFactor18 = pData[4] * pData[9] - pData[8] * pData[5];

    resData[0] = +pData[5] * subFactor00 - pData[6] * subFactor01 + pData[7] * subFactor02;
    resData[1] = -pData[4] * subFactor00 + pData[6] * subFactor03 - pData[7] * subFactor04;
    resData[2] = +pData[4] * subFactor01 - pData[5] * subFactor03 + pData[7] * subFactor05;
    resData[3] = -pData[4] * subFactor02 + pData[5] * subFactor04 - pData[6] * subFactor05;

    resData[4] = -pData[1] * subFactor00 + pData[2] * subFactor01 - pData[3] * subFactor02;
    resData[5] = +pData[0] * subFactor00 - pData[2] * subFactor03 + pData[3] * subFactor04;
    resData[6] = -pData[0] * subFactor01 + pData[1] * subFactor03 - pData[3] * subFactor05;
    resData[7] = +pData[0] * subFactor02 - pData[1] * subFactor04 + pData[2] * subFactor05;
    
    resData[8] = +pData[1] * subFactor06 - pData[2] * subFactor07 + pData[3] * subFactor08;
    resData[9] = -pData[0] * subFactor06 + pData[2] * subFactor09 - pData[3] * subFactor10;
    resData[10] = +pData[0] * subFactor11 - pData[1] * subFactor09 + pData[3] * subFactor12;
    resData[11] = -pData[0] * subFactor08 + pData[1] * subFactor10 - pData[2] * subFactor12;

    resData[12] = -pData[1] * subFactor13 + pData[2] * subFactor14 - pData[3] * subFactor15;
    resData[13] = +pData[0] * subFactor13 - pData[2] * subFactor16 + pData[3] * subFactor17;
    resData[14] = -pData[0] * subFactor14 + pData[1] * subFactor16 - pData[3] * subFactor18;
    resData[15] = +pData[0] * subFactor15 - pData[1] * subFactor17 + pData[2] * subFactor18;

    var determinant = 
        +pData[0] * resData[0]
        +pData[1] * resData[4]
        +pData[2] * resData[8]
        +pData[3] * resData[12];
    
    for (var i = 0; i < 16; ++i) {
        resData[i] /= determinant;
    }
}

function multiply(mat, v, outv) {
    outv[0] = mat[0] * v[0] + mat[1] * v[1] + mat[2] * v[2] + mat[3] * v[3];
    outv[1] = mat[4] * v[0] + mat[5] * v[1] + mat[6] * v[2] + mat[7] * v[3];
    outv[2] = mat[8] * v[0] + mat[9] * v[1] + mat[10] * v[2] + mat[11] * v[3];
    outv[3] = mat[12] * v[0] + mat[13] * v[1] + mat[14] * v[2] + mat[15] * v[3];
}

function screenToWorld(screen) {
    var v = new Float32Array(4);
    var world = new Float32Array(4);
    v[0] = screen[0];
    v[1] = screen[1];
    v[2] = screen[2];
    v[3] = 1.0;

    // map from viewport to 0-1
    v[0] = (v[0]) /viewPortW;
    v[1] = (viewPortH - v[1]) / viewPortH;

    // map to range -1 to 1
    v[0] = v[0] * 2.0 - 1.0;
    v[1] = v[1] * 2.0 - 1.0;
    v[2] = v[2] * 2.0 - 1.0;

    var mvp = mat4.create();
    var mvpInvert = mat4.create();
    // 计算mvp矩阵
    mat4.multiply(mvp, projectMat, viewMat);

    // mat4.invert(mvpInvert, mvp);
    inverseEx(mvp, mvpInvert);

    world[0] = v[0];
    world[1] = v[1];
    world[2] = v[2];
    world[3] = v[3];
    // mat4.multiply(world, mvpInvert, v);
    multiply(mvpInvert, v, world);

    if (world[3] == 0.0) {
        return world;
    }
    world[0] /= world[3];
    world[1] /= world[3];
    world[2] /= world[3];
    
    return world;
}

function moveTo(targetPos) {
    role._target = targetPos;
    role._target[1] = 0;
}

function updateTarget(elapsed) {
    if (role._target[0] == role._position[0] && 
        role._target[1] == role._position[1] && 
        role._target[2] == role._position[2]) {
        return;
    }
    var offset = new Float32Array(3);
    var dir = new Float32Array(3);
    offset[0] = role._target[0] - role._position[0];
    offset[1] = role._target[1] - role._position[1];
    offset[2] = role._target[2] - role._position[2];

    vec3.normalize(dir, offset);
    var dist = vec3.length(offset);
    if (dist > role._speed * elapsed / 1000.0 * 2) {
        var dist = role._speed * elapsed / 1000.0;
        role._position[0] += dir[0] * dist;
        role._position[2] += dir[2] * dist;
    } else {
        role._position[0] = role._target[0];
        role._position[1] = role._target[1];
        role._position[2] = role._target[2];
    }
}

function calcDir() {
    vec3.subtract(cameraLookAt, cameraCenter, cameraEye);
    vec3.normalize(cameraLookAt, cameraLookAt);
}

function updateCamera() {
    cameraEye[0] = cameraCenter[0] - cameraLookAt[0] * radius;
    cameraEye[1] = cameraCenter[1] - cameraLookAt[1] * radius;
    cameraEye[2] = cameraCenter[2] - cameraLookAt[2] * radius;

    // 规格化up坐标
    var upDir = vec3.normalize(cameraUp, cameraUp);
    // vec3.cross(cameraRight, cameraLookAt, cameraUp);
    // vec3.normalize(cameraRight. cameraRight);
    mat4.lookAt(viewMat, cameraEye, cameraCenter, upDir);
}

function rotateY(v, angle) {
    var res = new Float32Array(3);
    res[0] = v[0];
    res[1] = v[1];
    res[2] = v[2];

    var c = Math.cos(degToRad(angle));
    var s = Math.sin(degToRad(angle));

    res[0] = v[0] * c + v[2] * s;
    res[2] = -v[0] * s + v[2] * c;
    return res;
}

function renderScene() {

    renderToFBO();

    var elapsed = (new Date()).valueOf() - times;
    times = (new Date()).valueOf();

    updateTarget(elapsed);
    cameraCenter = role._position;
    updateCamera();

    varRotFBOX += 1;
    varRotFBOY += 1;

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
    var matMV = mat4.create();

    mat4.identity(matTrans);
    mat4.identity(matRotX);
    mat4.identity(matRotY);
    mat4.identity(matRot);
    mat4.identity(matTemp);
    mat4.identity(matModel);
    mat4.identity(matMV);

    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D, textureDynamic);
    webgl.uniform1i(uniformTexture, 0);

    mat4.translate(matTrans, matTrans, [role._position[0], 0.0, role._position[2]]);
    mat4.rotate(matRotX, matRotX, degToRad(varRotFBOX), [0.0, 1.0, 0.0]);
    mat4.rotate(matRotY, matRotY, degToRad(varRotFBOY), [1.0, 0.0, 0.0]);

    mat4.multiply(matRot, matRotY, matRotX);
    mat4.multiply(matModel, matTrans, matRot);

    mat4.multiply(matTemp, projectMat, viewMat);
    mat4.multiply(mvp, matTemp, matModel);

    // 计算观察与模型矩阵
    mat4.multiply(matMV, viewMat, matModel);

    var normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, matMV);
    mat3.transpose(normalMatrix, normalMatrix);
    webgl.uniformMatrix3fv(uniformNor, false, normalMatrix);
    webgl.uniformMatrix4fv(uniformMV, false, matMV);

    webgl.uniformMatrix4fv(uniformProj, false, mvp);

    webgl.enableVertexAttribArray(v3PositionIndex);
    webgl.enableVertexAttribArray(attrColor);
    webgl.enableVertexAttribArray(attrUV);
    webgl.enableVertexAttribArray(attrNormal);

    webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 12, 0);
    webgl.vertexAttribPointer(attrUV, 2, webgl.FLOAT, false, 4 * 12, 4 * 3);
    webgl.vertexAttribPointer(attrColor, 4, webgl.FLOAT, false, 4 * 12, 4 * 5);
    webgl.vertexAttribPointer(attrNormal, 3, webgl.FLOAT, false, 4 * 12, 4 * 9);

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