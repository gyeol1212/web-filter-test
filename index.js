"use strict";
// video
const video = document.getElementById("cam");
// video 위에 생성될 overlay
const overlay = document.getElementById("overlay");
// 새로운 사진을 캡쳐하기 위한 canvas
const canvas = document.getElementById("canvas");
let width = 600;
let height = 0;
let usedPreset = false;
// default filter data
const filter = {
  // 이하 0 ~ 100
  grayscale: 0,
  sepia: 0,
  invert: 0,
  hueRotate: 0, // deg
  blur: 0, // px
  // 이하 0 ~ 200%
  contrast: 100,
  brightness: 100,
  saturate: 100,
  opacity: 100
};

// 얼굴인식 위한 clmtracker 세팅
const ctrack = new clm.tracker();
ctrack.init();

// mediaDevices 사용
navigator.mediaDevices
  .getUserMedia({ video: true, audio: false })
  .then(stream => {
    video.srcObject = stream;

    // meta data 로드 후, video와 overlay size setting
    video.onloadedmetadata = () => {
      height = video.videoHeight / (video.videoWidth / width);
      video.setAttribute("width", 600);
      video.setAttribute("height", height);
      overlay.setAttribute("width", 600);
      overlay.setAttribute("height", height);
      const svg = document.getElementById("preset-svg");
      svg.style.height = height;
      svg.style.width = width;
    };

    // 준비 되면 play
    video.oncanplaythrough = () => {
      video.play();
    };
  })
  .catch(err => {
    console.log(err);
  });

// slide filter 적용
// event delegation 사용
$("fieldset").on("change", "input", e => {
  const { id, value } = e.target;
  const newFilter = makeFilter(false, id, value);
  video.style.filter = newFilter;
});

// filter data 생성
const makeFilter = (preset, id, value) => {
  // preset 사용 시
  if (preset) {
    usedPreset = id;
    return `url(#${id})`;
  }

  // 변화한 filter value 세팅
  if (id && value) {
    filter[id] = value;
  }

  // 현재 세팅된 filter object에 따라 새로운 Filter 생성
  let newFilter = "";
  Object.keys(filter).forEach(f => {
    if (f === "hueRotate") newFilter += `hue-rotate(${filter[f]}deg)`;
    else if (f === "blur") newFilter += `blur(${filter[f]}px)`;
    else {
      newFilter += `${f}(${filter[f]}%)`;
    }
  });

  usedPreset = false;

  return newFilter;
};

// 현재의 Filter 정보 얻기
const getFilter = () => {
  // preset 사용 중일 때,
  if (usedPreset) {
    return `url(#${usedPreset})`;
    // preset 사용 X
  } else {
    return makeFilter(false);
  }
};

const takePicture = () => {
  // context 세팅
  const context = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  // 캔버스에 그리기
  context.filter = getFilter();
  context.drawImage(video, 0, 0, width, height);
  context.drawImage(overlay, 0, 0, width, height);

  //캔버스로부터 실제 이미지를 가져오기
  const imgUrl = canvas.toDataURL("image/png");

  //엘리먼트를 만들고 가져온 이미지를 출력하기
  const img = document.createElement("img");
  img.setAttribute("src", imgUrl);
  img.height = 200;
  img.style.margin = "10px";

  //photos Div 안에 추가하기
  $("#photos").append(img);
};

// capture 버튼
$("#capture").click(() => {
  takePicture();
});

// event delegation 사용
$("#img-filter").on("click", "button", e => {
  // start video
  video.play();
  // start tracking
  ctrack.start(video);
  // start loop to draw face
  switch (e.target.id) {
    case "rabbit":
      drawRabbitEars();
      break;
    case "tongue":
      drawTongue();
      break;
    default:
      break;
  }
});

const overlayCC = overlay.getContext("2d");

// 토끼 귀
const rabbit = new Image();
rabbit.src = "./rabbit.png";

// 토끼 귀 그리기
const drawRabbitEars = () => {
  // 화면에 표시되는 동안만, frame에 맞게 반복 실행
  requestAnimationFrame(drawRabbitEars);
  // overlay 초기화
  overlayCC.clearRect(0, 0, width, height);

  if (ctrack.getCurrentPosition()) {
    // get points
    const positions = ctrack.getCurrentPosition();

    // get face position
    const leftEars = positions[0];
    const rightEars = positions[14];
    const nose = positions[33];
    const noseBottom = positions[37];

    const rabbitWidth = (rightEars[0] - leftEars[0]) * 1.3;
    const rabbitHeight = (rabbit.height * rabbitWidth) / rabbit.width;

    // draw rabbit
    overlayCC.drawImage(
      rabbit,
      nose[0] - rabbitWidth / 2,
      nose[1] - rabbitHeight - (noseBottom[1] - nose[1]),
      rabbitWidth,
      rabbitHeight
    );
  }
};

// 혀
const tongue = new Image();
tongue.src = "./tongue.png";

// 혀 그리기
const drawTongue = () => {
  requestAnimationFrame(drawTongue);
  overlayCC.clearRect(0, 0, width, height);
  if (ctrack.getCurrentPosition()) {
    // get points
    let positions = ctrack.getCurrentPosition();

    // get lip points
    const topLip = positions[60];
    const bottomLip = positions[57];
    const tongueWidth = positions[50][0] - positions[44][0];
    const tongueHeight = (tongue.height * tongueWidth) / tongue.width;

    // draw tongue
    if (bottomLip[1] - topLip[1] > 20) {
      overlayCC.drawImage(
        tongue,
        topLip[0] - tongueWidth / 2,
        topLip[1] + tongueHeight / 2,
        tongueWidth,
        tongueHeight
      );
    }
  }
};

// preset 선택 시, svg filter 적용
// event delegation 사용
$("#preset").on("click", "button", () => {
  const { name } = event.target;
  // 선택한 filter video에 적용
  video.style.filter = makeFilter(true, name);
});
