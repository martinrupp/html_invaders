// differenceAccuracy taken from
// https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/Webcam-Motion-Detection.html
//
// gl shader from https://scottland.cc/webrtc-real-time-image-filtering/
// https://codepen.io/scottdonaldson/pen/VXgEby

const video = document.getElementById('video');
const buffer = document.createElement('canvas');
const canvas = undefined; //document.getElementById('canvas');
const contextBlended = document.getElementById('canvas2');
let glslCanvas;

function init() {
    window.navigator.mediaDevices.getUserMedia(
        {audio: false, video: { facing: 'user' } })
    .then(setup)
    .catch(err => console.log('There was an error ', err));
}

function setup(stream) {
    if(canvas)
        canvas.style.display = 'block';
    document.getElementById('access').style.display = 'none';
    //document.getElementById('buttons').style.display = 'block';

    video.srcObject = stream;
    video.play();

    window.devicePixelRatio = 1;
    initDifference();
}

function render()
{
    buffer.width = video.videoWidth;
    buffer.height = video.videoHeight;
    buffer.getContext('2d').drawImage(video, 0, 0);

    if(canvas) {
        canvas.width = buffer.width;
        canvas.height = buffer.height;
    }


    updateDifference();
    window.requestAnimationFrame(render);
}


function threshold(value) {
    return (value > threshvalue) ? 0xFF : 0;
}
function fastAbs(value) {
    // funky bitwise, equal Math.abs
    return (value ^ (value >> 31)) - (value >> 31);
}


var threshvalue = 0x60;
var blocky = 40;
var sumvalue = 3000;
var posX = 0;
var lastX = 320;

function differenceAccuracy(target, data1, data2)
{
    var height = 480;
    var width = 640;
    if (data1.length != data2.length) return null;
    for(var x=0; x<width; x++)
    {
        for(var y=0; y<height; y++)
        {
            var i = x + (y)*width;
            var average1 = (data1[4 * i] + data1[4 * i + 1] + data1[4 * i + 2]) / 3;
            var average2 = (data2[4 * i] + data2[4 * i + 1] + data2[4 * i + 2]) / 3;
            var diff = threshold(fastAbs(average1 - average2));
            // i = width-x-1 + (y)*width;
            var i2 = width-1-x + (y)*width;
            if(diff != 0) {
                target[4 * i2] = 254;
                target[4 * i2 + 1] = 0;
                target[4 * i2 + 2] = 0;
            }
            else {
                target[4 * i2] = data2[4 * i];
                target[4 * i2 + 1] = data2[4 * i+1];
                target[4 * i2 + 2] = data2[4 * i+2];
            }
            target[4 * i2 + 3] = 0xFF;
            data1[4 * i2] = diff;
        }
    }

    // for(var i=0; i<width; i++) {
    //   y = 30;
    //   x = i;
    //   p = i+ width*y;
    //     diff = 255;
    //     target[4 * p] = diff;
    //     target[4 * p + 1] = diff;
    //     target[4 * p + 2] = diff;
    //     target[4 * p + 3] = 0xFF;
    // }

    var avgX = 0.0;
    var varSum = 0.0;
    for(var x=0; x<width; x+= blocky)
    {
        for(var y=0; y<height; y+= blocky)
        {
            var sum = 0.0
            for(var x1=0; x1<blocky; x1++) {
                for(var y1=0; y1<blocky; y1++)
                {
                    var xp = x + x1 + (y+y1)*width;
                    sum = sum + data1[4 * xp];
                }
            }

            if( sum > sumvalue )
            {
                varSum ++;
                avgX += x + blocky/2;
                // varSum = 1;
                // avgX = x + blocky/2;
                for(var x1=0; x1<blocky; x1++) {
                    for(var y1=0; y1<blocky; y1++) {
                        var xp = x + x1 + (y+y1)*width;
                        if(target[4 * xp] >= 254 && target[4 * xp+1] == 0 && target[4 * xp+2] == 0) continue;
                        var val = target[4 * xp];
                        if(val< 254) val = 250;

                        target[4 * xp] = val;
                        target[4 * xp + 1] = val;
                        target[4 * xp + 2] = val;
                    }
                }
            }
        }
    }

    if(varSum > 0) {
        // console.log(avgX + " " + varSum + " " + avgX / varSum);
        // console.log(list);
        avgX /= varSum;        
        //if(avgX<0) avgX=0;
        //if(avgX>=width-blocky) avgX=width-blocky-1;
        // posX = posX/4;
        // posX += (avgX | 0)/4;
    }
    else {
        avgX = lastX;
    }

    var smooth = 3;
    posX = (smooth*posX + (avgX | 0))/(smooth+1);
    posX = posX | 0;
    lastX = posX;
}

var lastImageData;
function initDifference()
{
    lastImageData = buffer.getContext('2d').getImageData(0, 0, buffer.width, buffer.height);
    contextBlended.getContext('2d').putImageData(lastImageData, 0, 0);
}

function updateDifference()
{
  if(lastImageData) {
        var showPic = true;
        var lastImageData2 = buffer.getContext('2d').getImageData(0, 0, buffer.width, buffer.height);

        // blend the 2 images
        if(true) {
            var blendedData = buffer.getContext('2d').createImageData(buffer.width, buffer.height);
            differenceAccuracy(blendedData.data, lastImageData.data, lastImageData2.data);
            if(contextBlended)
                contextBlended.getContext('2d').putImageData(blendedData, 0, 0);
        }
        else {
            if(showPic && contextBlended)
                contextBlended.getContext('2d').putImageData(lastImageData2, 0, 0);
            differenceAccuracy2(lastImageData.data, lastImageData2.data);
        }
        // draw the result in a canvas
        
        
        lastImageData = lastImageData2;
        if(contextBlended) {
            var ctx = contextBlended.getContext('2d');
            if(!showPic)
                ctx.clearRect(0, 0, 640, 480);
            ctx.beginPath();
            ctx.rect(0, 0, 640, 480);
            ctx.stroke();
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.rect(posX, 100, 10, 380);
            ctx.fill();
        }
        var lborder = 150;
        var rborder = 150;
        var f = posX - lborder;
        if(f < 0) f = 0;
        if(f > 640-(lborder+rborder)) f = 640-(lborder+rborder);
        f = f*640.0;
        f = ((f/ (640-(lborder+rborder)) )) | 0;

        //document.getElementById('posXlabel').innerHTML = posX + " " + f;
        GameManager.player.updatePosition(f, GameManager.player.position.y);
    }

}

video.addEventListener('canplay', render);
init();
