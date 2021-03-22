/**
 * Lesson13-点精灵
 * @Author: lzmxqh 
 * @Date: 2021-03-23 00:36:51 
 * @Last Modified by:   lzmxqh 
 * @Last Modified time: 2021-03-23 00:36:51 
 */
/**顶点着色器 */ 
var vs = `
    attribute vec3 v3Position;
    uniform mat4 proj;
    uniform float angle;
    void main() {
        gl_PointSize = 16.0;
        float x = length(v3Position) * cos(angle);
        float y = length(v3Position) * sin(angle);
        gl_Position = proj * vec4(v3Position.x + x, v3Position.y + y, v3Position.z, 1.0);
    }
`;

/**片段着色器 */ 
var fs = `
    precision mediump float;
    uniform sampler2D texture;
    void main() {
        vec4 color = texture2D(texture, gl_PointCoord);
        if (color.w < 0.1) {
            discard;
        }
        gl_FragColor = color;
    }
`;

var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;
var vertexBuffer = null;
var v3PositionIndex = 0;

var mat4 = glMatrix.mat4;
var projectMat = null;
var uniformProj = 0;

var uniformAngle = 0;
var angle = 0;

var textureHandle = null;
var uniformTexture = 0;

function onStart() {
    init();
    onTick();
}

function init() {
    //获取canvas元素
    var canvas = document.getElementById('canvas');
    //获取绘制二维上下文
    webgl = canvas.getContext('webgl');
    webgl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    projectMat = mat4.create();
    mat4.ortho(projectMat, 0, canvas.clientWidth, canvas.clientHeight, 0, -1.0, 1.0);
        
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
    uniformAngle = webgl.getUniformLocation(programObject, "angle");

    webgl.uniformMatrix4fv(uniformProj, false, projectMat);

    var dataPoint = new Float32Array(100 * 3);
    for (var i = 0; i < 100; i++) {
        dataPoint[i * 3 + 0] = Math.random() * 500;
        dataPoint[i * 3 + 1] = Math.random() * 500;
        dataPoint[i * 3 + 2] = 0;
    }
    
    vertexBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, vertexBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, dataPoint, webgl.STATIC_DRAW); 
    webgl.enable(webgl.BLIND);
    webgl.blendFunc(webgl.SRC_ALPHA, webgl.ONE_MINUS_SRC_ALPHA);

    // chrome软件目标路径加上 --allow-file-access-from-files
    initTexture("./res/1.png");
}

function initTexture(imageFile) {
    // 创建一个纹理 webgl
    textureHandle = webgl.createTexture();
    // 创建一个图片
    textureHandle.image = new Image();
    // 指定图片的路径
    textureHandle.image.src = imageFile;
    textureHandle.image.onload = function() {
        handleLoadedTexture(textureHandle);
    }
}

function handleLoadedTexture(texture) {
    webgl.bindTexture(webgl.TEXTURE_2D, texture);
    
    webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, texture.image);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.REPEAT);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.REPEAT);

    webgl.bindTexture(webgl.TEXTURE_2D, null);
}

function onRender() {
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    webgl.enable(webgl.DEPTH_TEST);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, vertexBuffer);

    webgl.useProgram(programObject);
    {        
        angle += 1;

        webgl.activeTexture(webgl.TEXTURE0);
        webgl.bindTexture(webgl.TEXTURE_2D, textureHandle);
        webgl.uniform1i(uniformTexture, 0);
        webgl.uniform1f(uniformAngle, angle * Math.PI / 180);

        webgl.enableVertexAttribArray(v3PositionIndex);

        webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 3, 0);

        webgl.drawArrays(webgl.POINTS, 0, 100);
    }
    webgl.useProgram(null);
}

function onTick() {
    requestAnimFrame(onTick);
    onRender();
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