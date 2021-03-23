/**
 * Lesson14-多纹理
 * @Author: lzmxqh 
 * @Date: 2021-03-23 21:51:32 
 * @Last Modified by: lzmxqh
 * @Last Modified time: 2021-03-23 22:35:47
 */
/**顶点着色器 */ 
var vs = `
    attribute vec3 v3Position;
    attribute vec2 inUV;
    uniform mat4 proj;
    varying vec2 outUV;
    void main() {
        gl_Position = proj * vec4(v3Position, 1.0);
        outUV = inUV;
    }
`;

/**片段着色器 */ 
var fs = `
    precision mediump float;
    uniform sampler2D texture;
    uniform sampler2D texture1;
    uniform float anim;
    varying vec2 outUV;
    void main() {
        vec4 color = texture2D(texture, outUV);
        vec4 color1 = texture2D(texture1, vec2(outUV.s + anim, outUV.t + anim));
        gl_FragColor = color * color1;
    }
`;

var webgl = null;
var vertexShaderObject = null;
var fragmentShaderObject = null;
var programObject = null;
var triangleBuffer = null;
var v3PositionIndex = 0;

var uniformAnim = 0;
var animStep = 0;

var mat4 = glMatrix.mat4;
var projectMat = null;
var uniformProj = 0;

var textureHandle = null;
var textureHandle1 = null;

var uniformTexture = 0;
var uniformTexture1 = 0;
var attrUV = 1;

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
    webgl.bindAttribLocation(programObject, attrUV, "inUV");

    uniformProj = webgl.getUniformLocation(programObject, "proj");
    uniformTexture = webgl.getUniformLocation(programObject, "texture");
    uniformTexture1 = webgl.getUniformLocation(programObject, "texture1");
    uniformAnim = webgl.getUniformLocation(programObject, "anim");

    var jsArrayData = [
        0, 0, 0, 0.0, 0.0,
        400, 0, 0, 2.0, 0.0,
        400, 400, 0, 2.0, 2.0,

        0, 0, 0, 0.0, 0.0,
        400, 400, 0, 2.0, 2.0,
        0, 400, 0, 0.0, 2.0
    ];
    
    triangleBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(jsArrayData), webgl.STATIC_DRAW); 

    // chrome软件目标路径加上 --allow-file-access-from-files
    textureHandle = initTexture("./res/1.jpg");
    textureHandle1 = initTexture("./res/2.png");
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
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.NEAREST);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.MIRRORED_REPEAT);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.MIRRORED_REPEAT);

    webgl.bindTexture(webgl.TEXTURE_2D, null);
}

function onRender() {
    webgl.clearColor(0.0, 0.0, 0.0, 1.0);
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);
    webgl.enable(webgl.DEPTH_TEST);

    webgl.bindBuffer(webgl.ARRAY_BUFFER, triangleBuffer);

    animStep += 0.01;

    webgl.useProgram(programObject);
    {
        webgl.uniformMatrix4fv(uniformProj, false, projectMat);
        webgl.uniform1f(uniformAnim, animStep);
        
        webgl.activeTexture(webgl.TEXTURE0);
        webgl.bindTexture(webgl.TEXTURE_2D, textureHandle);
        webgl.uniform1i(uniformTexture, 0);

        webgl.activeTexture(webgl.TEXTURE1);
        webgl.bindTexture(webgl.TEXTURE_2D, textureHandle1);
        webgl.uniform1i(uniformTexture1, 1);
    
        webgl.enableVertexAttribArray(v3PositionIndex);
        webgl.enableVertexAttribArray(attrUV);

        webgl.vertexAttribPointer(v3PositionIndex, 3, webgl.FLOAT, false, 4 * 5, 0);
        webgl.vertexAttribPointer(attrUV, 2, webgl.FLOAT, false, 4 * 5, 4 * 3);

        webgl.drawArrays(webgl.TRIANGLES, 0, 6);
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