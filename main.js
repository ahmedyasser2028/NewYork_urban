require(["esri/Map","esri/layers/FeatureLayer","esri/views/MapView","esri/core/promiseUtils","esri/widgets/Legend","esri/widgets/Home","esri/widgets/Slider","esri/widgets/Fullscreen"], 
(
  Map,FeatureLayer,MapView,promiseUtils,Legend,Home,Slider,Fullscreen)=> {
  const layer = new FeatureLayer({
    portalItem: {
      id: "dfe2d606134546f5a712e689d76540ac"
    },
    definitionExpression: "CNSTRCT_YR > 0",
    title: "Building Footprints",
    minScale: 72223.819286,
    effect: "bloom(2.5 0 0.5)"
  });
  const map = new Map({
    basemap: {

       portalItem: {
        id: "4f2e99ba65e34bb8af49733d9778fb8e"
      }
    },
     layers: [layer]
  });

  const view = new MapView({
    map: map,
    container: "viewDiv",
    center: [-73.967569, 40.727724],
    zoom: 12,
    constraints: {
      minScale: 72223.819286,
      snapToZoom: false
    },
    resizeAlign: "top-left"
  });
  const NewYork = document.getElementById("NewYork");
  const sliderValue = document.getElementById("sliderValue");
  const playBtn = document.getElementById("playBtn");
  const titleDiv = document.getElementById("titleDiv");
  let animation = null;
  const slider = new Slider({
    container: "slider",
    min: 1880,
    max: 2017,
    values: [1984],
    step: 1,
    visibleElements: {
    rangeLabels: true
    }
  });
  function inputHandler(event) {
    stopAnimation();
    setYear(event.value);
  }
  slider.on("thumb-drag", inputHandler);

  playBtn.addEventListener("click", () => {
    if (playBtn.classList.contains("toggled")) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });
  view.ui.empty("top-left");
  view.ui.add(titleDiv, "top-left");
  view.ui.add(
    new Home({
      view: view
    }),
    "top-right"
  );
  view.ui.add(
    new Legend({
      view: view
    }),
    "bottom-left"
  );
  view.ui.add(
    new Fullscreen({
      view: view,
      element: NewYork
    }),
    "top-right"
  );

  view.whenLayerView(layer).then(setupHoverTooltip);
  setYear(1984);
  function setYear(value) {
    sliderValue.innerHTML = Math.floor(value);
    slider.viewModel.setValue(0, value);
    layer.renderer = createRenderer(value);
  }

  function createRenderer(year) {
    const opacityStops = [
      {
        opacity: 1,
        value: year
      },
      {
        opacity: 0,
        value: year + 1
      }
    ];

    return {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: "rgb(0, 0, 0)",
        outline: null
      },
      visualVariables: [
        {
          type: "opacity",
          field: "CNSTRCT_YR",
          stops: opacityStops,
          legendOptions: {
            showLegend: false
          }
        },
        {
          type: "color",
          field: "CNSTRCT_YR",
          legendOptions: {
            title: "Built:"
          },
          stops: [
            {
              value: year,
              color: "#0ff",
              label: "in " + Math.floor(year)
            },
            {
              value: year - 10,
              color: "#f0f",
              label: "in " + (Math.floor(year) - 20)
            },
            {
              value: year - 50,
              color: "#404",
              label: "before " + (Math.floor(year) - 50)
            }
          ]
        }
      ]
    };
  }
  function setupHoverTooltip(layerview) {
    let highlight;
    const tooltip = createTooltip();
    const hitTest = promiseUtils.debounce((event) => {
      return view.hitTest(event).then((hit) => {
        const results = hit.results.filter((result) => {
          return result.graphic.layer === layer;
        });

        if (!results.length) {
          return null;
        }
        return {
          graphic: results[0].graphic,
          screenPoint: hit.screenPoint
        };
      });
    });
    view.on("pointer-move", (event) => {
      return hitTest(event).then(
        (hit) => {
          if (highlight) {
            highlight.remove();
            highlight = null;
          }
          if (hit) {
            const graphic = hit.graphic;
            const screenPoint = hit.screenPoint;
            highlight = layerview.highlight(graphic);
            tooltip.show(
              screenPoint,
              "Built in " + graphic.getAttribute("CNSTRCT_YR")
            );
          } else {
            tooltip.hide();
          }
        },
        () => {}
      );
    });
  }
  function startAnimation() {
    stopAnimation();
    animation = animate(slider.values[0]);
    playBtn.classList.add("toggled");
  }
  function stopAnimation() {
    if (!animation) {
      return;
    }

    animation.remove();
    animation = null;
    playBtn.classList.remove("toggled");
  }
  function animate(startValue) {
    let animating = true;
    let value = startValue;

    const frame = (timestamp) => {
      if (!animating) {
        return;
      }

      value += 0.5;
      if (value > 2017) {
        value = 1880;
      }

      setYear(value);
      setTimeout(() => {
        requestAnimationFrame(frame);
      }, 1000 / 30);
    };

    frame();

    return {
      remove: () => {
        animating = false;
      }
    };
  }
  function createTooltip() {
    const tooltip = document.createElement("div");
    const style = tooltip.style;
    tooltip.setAttribute("role", "tooltip");
    tooltip.classList.add("tooltip");
    const textElement = document.createElement("div");
    textElement.classList.add("esri-widget");
    tooltip.appendChild(textElement);
    view.container.appendChild(tooltip);
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let visible = false;
    function move() {
      x += (targetX - x) * 0.1;
      y += (targetY - y) * 0.1;
      if (Math.abs(targetX - x) < 1 && Math.abs(targetY - y) < 1) {
        x = targetX;
        y = targetY;
      } else {
        requestAnimationFrame(move);
      }

      style.transform =
        "translate3d(" + Math.round(x) + "px," + Math.round(y) + "px, 0)";
    }

    return {
      show: (point, text) => {
        if (!visible) {
          x = point.x;
          y = point.y;
        }
        targetX = point.x;
        targetY = point.y;
        style.opacity = 1;
        visible = true;
        textElement.innerHTML = text;
        move();
      },
      hide: () => {
        style.opacity = 0;
        visible = false;
      }
    };
  }
});