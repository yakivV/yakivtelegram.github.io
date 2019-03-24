class TelegramChart {
  constructor(settings) {
    this.svgId = Date.now();

    this.svgClass = "chart";
    this.linesContainerId = this.svgId + "_lines_container";
    this.checkboxLineId = this.svgId + "_checkbox_line_";
    this.xAxisId = this.svgId + "_x_days";
    this.yAxisId = this.svgId + "_y_data";
    this.mainLinePrefixId = this.svgId + "_main_";
    this.scrollbarLinePrefixId = this.svgId + "_scrollbar_";
    this.scrollbarId = this.svgId + "_scrollbar";
    this.leftScrollId = this.svgId + "_left_scroll";
    this.rightScrollId = this.svgId + "_right_scroll";
    this.mainScrollId = this.svgId + "_main_scroll";
    this.leftMainScrollBorderId = this.svgId + "_left_main_scroll_border";
    this.rightMainScrollBorderId = this.svgId + "_right_main_scroll_border";

    this.formatDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    this.formatMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // CONTAINER FOR ALL CHARTS
    this.containerId = settings.containerId;
    this.container = document.getElementById(this.containerId);

    // CHART CONTAINER
    this.chartName = settings.chartName;
    this.chartNameClass = "chart-name";
    this.chartContainerClass = "chart-container";
    this.chartContainerId = this.svgId + "_container";
    this.chartContainer = null;
    this.lineBarContainerId = this.svgId + "_line_bar_container";
    this.lineBarContainer = null;
    this.lineBarDataContainerId = this.svgId + "_line_bar_data_container"
    this.lineBarDataContainer = null;

    // POPUP CONTAINER
    this.popupId = this.svgId + "_popup_data";
    this.linePopupContainerId = this.svgId + "_popup_container";
    this.linePopupContainer = null;

    // SVG
    this.svg = null;
    this.svgHeight = settings.svgHeight; // in px
    this.svgWidth = this.container.offsetWidth; // in px

    // DATA
    this.columns = settings.data.columns;
    this.types = settings.data.types;
    this.names = settings.data.names;
    this.colors = settings.data.colors;
    this.minPercentRange = 5;
    this.countItemsInRange = 0;
    this.rangeFrom = 60; // !!!DYNAMIC!!! this is percent.
    this.rangeTo = 100; // !!!DYNAMIC!!! this is percent.
    this.defaultX = []; // array of data X axis
    this.defaultY = [];
    this.x = []; // array of data X axis
    this.y = []; // array of objects [{name: "y0", data:[-data of y0-]}, {name: "y1", data:[-data of y01-]}, ...]
    this.totalRecords = 0; // length of the x array (y the same)
    this.allowedLines = [];
    this.xMainStep = 0;
    this.yMainStep = 0;
    this.xBarStep = 0;
    this.yBarStep = 0;
    this.maxDataHeightY = 0;

    // Y axis. Data
    this.maxDataLinesOnScreen = 6;

    // X axis. Dates
    this.maxDatesOnScreen = 5;

    // CHART PARAMS
    this.linesContainer = null;
    this.mainChartHeight = this.svgHeight - 100;
    this.mainChartStartY = this.mainChartHeight + 5;
    this.scrollbarChartHeight = 50;
    this.scrollbarChartStartY = this.svgHeight;

    // SCROLLBAR
    this.mainScrollBorderWidth = 5;
    this.scrollbarStartY = this.svgHeight - this.scrollbarChartHeight;
    // 1. !!!DYNAMIC!!!
    this.startMouseX = 0;
    this.startMainScrollWidth = 0;
    this.startLeftScrollWidth = 0;
    this.startRightScrollWidth = 0;
    this.startMainScrollAttrX = 0;
    this.startRightScrollAttrX = 0;
    this.startLeftBorderAttrX = 0;
    this.startRightBorderAttrX = 0;
    // 2. Elements
    this.mainScroll = null;
    this.leftScroll = null;
    this.rightScroll = null;
    this.leftBorder = null;
    this.rightBorder = null;
    // 3. bind event functions
    this.initResize = this._initResize.bind(this);
    this.initDrag = this._initDrag.bind(this);
    this.stopEvents = this._stopEvents.bind(this);
    this.doDrag = this._doDrag.bind(this);
    this.doResizeLeft = this._doResizeLeft.bind(this);
    this.doResizeRight = this._doResizeRight.bind(this);

    // CHART LINE CHECKBOXES
    this.lineTooglerContainerId = this.svgId + "_line_toogler_container";
    this.lineTooglerContainer = null;
    this.toogleLine = this._toogleLine.bind(this);
  }

  //////////////// HELPERS ///////////////
  _prepareData() { // set this.x, this.y, this.totalRecords, this.allowedLines
    var x = [];
    var y = [];
    var allowedLines = [];

    this.columns.forEach(column => {
      if (column[0] == "x") {
        column.shift();
        x = column;
      } else {
        var name = column[0];
        column.shift();
        var data = column;

        y.push({
          "name": name,
          "data": data
        });

        allowedLines.push(name);
      }
    });

    this.defaultX = x;
    this.defaultY = y;
    this.totalRecords = x.length;
    this.allowedLines = allowedLines;
  }

  _isLineAllowed(name) {
    return this.allowedLines.indexOf(name) === -1 ? false : true;
  }

  _calculateStepX(range, widthBlock) {
    return widthBlock / (range.length - 1);
  }
  _calculateStepY(range, heightBlock) {
    var step = 0;
    var maxY = 0;

    range.forEach((y) => {
      if (!this._isLineAllowed(y.name)) return;

      var max = Math.max.apply(null, y.data);
      
      if (max > maxY) {
        maxY = max;
      }
    });

    step = heightBlock / maxY;

    return step;
  }

  _calculateXYStepForMainChart() {
    this.xMainStep = this._calculateStepX(this.x, this.svgWidth);
    this.yMainStep = this._calculateStepY(this.y, this.mainChartHeight);
  }
  _calculateXYStepForBarChart() {
    this.xBarStep = this._calculateStepX(this.defaultX, this.svgWidth);
    this.yBarStep = this._calculateStepY(this.defaultY, this.scrollbarChartHeight-5);
  }

  _updateCountItemsInRange() {
    var arrayPosFrom = Math.trunc(this.rangeFrom * this.totalRecords / 100);
    var arrayPosTo = Math.trunc(this.rangeTo * this.totalRecords / 100);

    this.countItemsInRange = arrayPosTo - arrayPosFrom;
  }

  _updateDataByRange() {
    var arrayPosFrom = Math.trunc(this.rangeFrom * this.totalRecords / 100);
    var arrayPosTo = arrayPosFrom + this.countItemsInRange;

    var x = this.defaultX.slice();
    var y = this.defaultY.slice();

    var xRange = x.slice(arrayPosFrom, arrayPosTo);
    var yRange = [];
    y.forEach(el => {
      yRange.push({
        name: el.name,
        data: el.data.slice(arrayPosFrom, arrayPosTo)
      });
    });

    this.x = xRange;
    this.y = yRange;
  }

  _createSVGElement(name, attributes) {
    var xmlns = "http://www.w3.org/2000/svg";
    var el = document.createElementNS(xmlns, name);

    attributes.forEach(attr => {
      el.setAttributeNS(null, attr.name, attr.value);
    });

    return el;
  }

  _getRangeInPixels(from, to) {
    var resultFrom = from * this.svgWidth / 100;
    var resultTo = to * this.svgWidth / 100;

    return [resultFrom, resultTo];
  }

  _getRangeInPercent(from, to) {
    var resultFrom = from * 100 / this.svgWidth;
    var resultTo = to * 100 / this.svgWidth;

    return [resultFrom, resultTo];;
  }

  _updateRange(from, to) {
    this.rangeFrom = from;
    this.rangeTo = to;
  }

  //////////////// SCROLLBAR HELPERS ///////////////
  _setScrollBarElements() {
    this.mainScroll = document.getElementById(this.mainScrollId);
    this.leftScroll = document.getElementById(this.leftScrollId);
    this.rightScroll = document.getElementById(this.rightScrollId);
    this.leftBorder = document.getElementById(this.leftMainScrollBorderId);
    this.rightBorder = document.getElementById(this.rightMainScrollBorderId);
  }

  _setScrollBarEvents() {
    this.leftBorder.addEventListener('mousedown', this.initResize, false);
    this.rightBorder.addEventListener('mousedown', this.initResize, false);
    this.mainScroll.addEventListener('mousedown', this.initDrag, false);
  }

  _stopEvents() {
    document.documentElement.removeEventListener('mousemove', this.doDrag, false);
    document.documentElement.removeEventListener('mousemove', this.doResizeLeft, false);
    document.documentElement.removeEventListener('mousemove', this.doResizeRight, false);
    document.documentElement.removeEventListener('mouseup', this.stopEvents, false);

    this._drawVerticalBar(this.x, this.y, this.mainChartStartY); 
  }
  
  _init(e) {
    this.startMouseX = e.clientX;
    this.startMainScrollWidth = this.mainScroll.getBBox().width;
    this.startLeftScrollWidth = this.leftScroll.getBBox().width;
    this.startRightScrollWidth = this.rightScroll.getBBox().width;
    this.startMainScrollAttrX = this.mainScroll.getBBox().x;
    this.startRightBorderAttrX = this.rightBorder.getBBox().x;
    this.startLeftBorderAttrX = this.leftBorder.getBBox().x;
    this.startRightScrollAttrX = this.rightScroll.getBBox().x;

    this._clearVerticalBar();
  }
  _initDrag(e) {
    this._init(e);
  
    document.documentElement.addEventListener('mousemove', this.doDrag, false);
    document.documentElement.addEventListener('mouseup', this.stopEvents, false);
  }
  _initResize(e) {
    this._init(e);
  
    if (e.target.id === this.leftMainScrollBorderId) {
      document.documentElement.addEventListener('mousemove', this.doResizeLeft, false);
      document.documentElement.addEventListener('mouseup', this.stopEvents, false);
    }
    if (e.target.id === this.rightMainScrollBorderId) {
      document.documentElement.addEventListener('mousemove', this.doResizeRight, false);
      document.documentElement.addEventListener('mouseup', this.stopEvents, false);
    }
  }
  
  _doDrag(e) {
    var currentLeftScrollWidth = this.startLeftScrollWidth + e.clientX - this.startMouseX;
    var currentRightScrollWidth = this.startRightScrollWidth + this.startMouseX - e.clientX;
    
    if (currentLeftScrollWidth <= 0) {
      currentLeftScrollWidth = 0;
      currentRightScrollWidth = this.svgWidth - this.startMainScrollWidth;
      this.mainScroll.setAttribute('x', 0);
      this.rightScroll.setAttribute('x', this.startMainScrollWidth);
      this.leftBorder.setAttribute('x', 0);
      this.rightBorder.setAttribute('x', this.startMainScrollWidth - this.mainScrollBorderWidth);
      this.leftScroll.style.width = currentLeftScrollWidth + 'px';
      this.rightScroll.style.width = currentRightScrollWidth + 'px';
    } else if (currentRightScrollWidth <= 0) {
      currentLeftScrollWidth = this.svgWidth - this.startMainScrollWidth;
      currentRightScrollWidth = 0;
      this.mainScroll.setAttribute('x', this.svgWidth - this.startMainScrollWidth);
      this.rightScroll.setAttribute('x', this.svgWidth);
      this.leftBorder.setAttribute('x', this.svgWidth - this.startMainScrollWidth);
      this.rightBorder.setAttribute('x', this.svgWidth - this.mainScrollBorderWidth);
      this.leftScroll.style.width = currentLeftScrollWidth + 'px';
      this.rightScroll.style.width = currentRightScrollWidth + 'px';
    } else {  
      this.mainScroll.setAttribute('x', this.startMainScrollAttrX - (this.startMouseX - e.clientX));
      this.rightScroll.setAttribute('x', this.startRightScrollAttrX - (this.startMouseX - e.clientX));
      this.leftBorder.setAttribute('x', this.startLeftBorderAttrX - (this.startMouseX - e.clientX));
      this.rightBorder.setAttribute('x', this.startRightBorderAttrX - (this.startMouseX - e.clientX));
      this.leftScroll.style.width = currentLeftScrollWidth + 'px';
      this.rightScroll.style.width = currentRightScrollWidth + 'px';
    }

    var [from, to] = this._getRangeInPercent(currentLeftScrollWidth, this.svgWidth - currentRightScrollWidth);
    this._updateRange(from, to);
    this._updateDataByRange(); // do it every time when range is changed
    this._calculateXYStepForMainChart(); // do it every time when RANGE IS CHANGED ONLY
    this._drawMainChart();
  }
  _doResizeLeft(e) {
    var minDistanceBetweenBorders = this.svgWidth * this.minPercentRange / 100;
    var mouseMoveToLeft = this.startMouseX - e.clientX; 
    var currentMainScrollWidth = this.startMainScrollWidth + mouseMoveToLeft;
    var currentLeftBorderAttrX = this.startLeftBorderAttrX - mouseMoveToLeft;
    var currentLeftScrollWidth = this.startLeftScrollWidth - mouseMoveToLeft;

    if (currentMainScrollWidth <= minDistanceBetweenBorders) return; 

    if (currentLeftBorderAttrX <= 0) {
      currentLeftScrollWidth = 0;
      this.leftBorder.setAttribute('x', 0);
      this.mainScroll.setAttribute('x', 0);
      this.mainScroll.style.width = (this.svgWidth - this.startRightScrollWidth) + 'px';
      this.leftScroll.style.width = currentLeftScrollWidth + 'px';
    } else {
      this.leftBorder.setAttribute('x', this.startLeftBorderAttrX - mouseMoveToLeft);
      this.mainScroll.setAttribute('x', this.startMainScrollAttrX - mouseMoveToLeft);
      this.mainScroll.style.width = currentMainScrollWidth + 'px';
      this.leftScroll.style.width = currentLeftScrollWidth + 'px';
    }

    var [from, to] = this._getRangeInPercent(currentLeftScrollWidth, currentLeftScrollWidth + currentMainScrollWidth);
    this._updateRange(from, to);
    this._updateCountItemsInRange(); // do it every time when RANGE IS CHANGED ONLY
    this._updateDataByRange(); // do it every time when range is changed or scroll dragged
    this._calculateXYStepForMainChart(); // do it every time when RANGE IS CHANGED ONLY
    this._drawMainChart();
  }
  _doResizeRight(e) {
    var minDistanceBetweenBorders = this.svgWidth * this.minPercentRange / 100;
    var mouseMoveToRight = e.clientX - this.startMouseX; 
    var currentMainScrollWidth = this.startMainScrollWidth + mouseMoveToRight;
    var currentRightBorderAttrX = this.startRightBorderAttrX + mouseMoveToRight;
    var currentRightScrollWidth = this.startRightScrollWidth - mouseMoveToRight;

    if (currentMainScrollWidth <= minDistanceBetweenBorders) return;

    if (currentRightBorderAttrX >= this.svgWidth - this.mainScrollBorderWidth) { 
      currentRightScrollWidth = 0;
      currentMainScrollWidth = this.svgWidth - this.startLeftScrollWidth;
      this.rightBorder.setAttribute('x', this.svgWidth - this.mainScrollBorderWidth);
      this.rightScroll.setAttribute('x', this.svgWidth);
      this.mainScroll.style.width = currentMainScrollWidth + 'px';
      this.rightScroll.style.width = currentRightScrollWidth + 'px';
    } else {
      this.rightBorder.setAttribute('x', this.startRightBorderAttrX + mouseMoveToRight);
      this.rightScroll.setAttribute('x', this.startRightScrollAttrX + mouseMoveToRight);
      this.mainScroll.style.width = currentMainScrollWidth + 'px';
      this.rightScroll.style.width = currentRightScrollWidth + 'px';
    }

    var [from, to] = this._getRangeInPercent(this.svgWidth - (currentRightScrollWidth + currentMainScrollWidth), currentRightBorderAttrX);
    this._updateRange(from, to);
    this._updateCountItemsInRange(); 
    this._updateDataByRange(); 
    this._calculateXYStepForMainChart(); 
    this._drawMainChart();
  }

  //////////////// TOOGLE LINES ///////////////
  _toogleLine(e) {
    var lineName = e.target.dataset.chartName;
    var index = this.allowedLines.indexOf(lineName);
 
    if (index > -1) {
      this.allowedLines.splice(index, 1);
    } else {
      this.allowedLines.push(lineName);
    }

    this._calculateXYStepForMainChart(); 
    this._calculateXYStepForBarChart(); 

    this._drawMainChart();
    this._drawBarChart();
  }

  //////////////// CREATORS ///////////////
  _addChartContainer() {
    var div = document.createElement("div");
    div.setAttribute("id", this.chartContainerId);
    div.setAttribute("class", this.chartContainerClass);

    this.container.appendChild(div);

    this.chartContainer = document.getElementById(this.chartContainerId);
  }

  _addChartName() {
    var div = document.createElement("div");
    div.setAttribute("class", this.chartNameClass);
    div.innerText = this.chartName;

    this.chartContainer.appendChild(div);
  }

  _addSvg() {
    var svg = this._createSVGElement(
      "svg",
      [
        {name: "id", value: this.svgId},
        {name: "class", value: this.svgClass},
        {name: "height", value: this.svgHeight},
        {name: "shape-rendering", value: "auto"}
      ]
    );

    this.chartContainer.appendChild(svg);

    this.svg = document.getElementById(this.svgId);
  }

  _addLinesContainer() {
    var el = this._createSVGElement(
      "g",
      [
        {name: "id", value: this.linesContainerId},
      ]
    );

    this.svg.appendChild(el);

    this.linesContainer = document.getElementById(this.linesContainerId);
  }

  _addLineBarContainer() {
    var el = this._createSVGElement(
      "g",
      [
        {name: "id", value: this.lineBarContainerId},
      ]
    );

    this.svg.appendChild(el);

    this.lineBarContainer = document.getElementById(this.lineBarContainerId);
  }

  _addLineBarDataContainer() {
    var el = this._createSVGElement(
      "g",
      [
        {name: "id", value: this.lineBarDataContainerId},
      ]
    );

    this.svg.appendChild(el);

    this.lineBarDataContainer = document.getElementById(this.lineBarDataContainerId);
  }

  _addXYAxises() {
    var x = this._createSVGElement(
      "g",
      [
        {name: "id", value: this.xAxisId},
      ]
    );

    var y = this._createSVGElement(
      "g",
      [
        {name: "id", value: this.yAxisId},
      ]
    );

    this.svg.appendChild(x);
    this.svg.appendChild(y);
  }
  
  _addScrollBar() {
    var [xFrom, xTo] = this._getRangeInPixels(this.rangeFrom, this.rangeTo);

    var leftScrollWidth = xFrom;
    var leftScroll = this._createSVGElement(
      "rect",
      [
        {name: "id", value: this.leftScrollId},
        {name: "fill", value: "rgba(245, 249, 251, 0.8)"},
        {name: "height", value: this.scrollbarChartHeight},
        {name: "y", value: this.scrollbarStartY},
        {name: "x", value: "0"},
        {name: "width", value: leftScrollWidth},
      ]
    );
    
    var rightScrollX = xTo;
    var rightScrollWidth = this.svgWidth - xTo; 
    var rightScroll = this._createSVGElement(
      "rect",
      [
        {name: "id", value: this.rightScrollId},
        {name: "fill", value: "rgba(245, 249, 251, 0.8)"},
        {name: "height", value: this.scrollbarChartHeight},
        {name: "y", value: this.scrollbarStartY},
        {name: "x", value: rightScrollX},
        {name: "width", value: rightScrollWidth},
      ]
    );

    var leftMainScrollBorderX = xFrom;
    var leftMainScrollBorder = this._createSVGElement(
      "rect",
      [
        {name: "id", value: this.leftMainScrollBorderId},
        {name: "fill", value: "rgb(220, 234, 242)"},
        {name: "height", value: this.scrollbarChartHeight},
        {name: "width", value: this.mainScrollBorderWidth},
        {name: "y", value: this.scrollbarStartY},
        {name: "x", value: leftMainScrollBorderX},
      ]
    );

    var rightMainScrollBorderX = xTo - this.mainScrollBorderWidth;
    var rightMainScrollBorder = this._createSVGElement(
      "rect",
      [
        {name: "id", value: this.rightMainScrollBorderId},
        {name: "fill", value: "rgb(220, 234, 242)"},
        {name: "height", value: this.scrollbarChartHeight},
        {name: "width", value: this.mainScrollBorderWidth},
        {name: "y", value: this.scrollbarStartY},
        {name: "x", value: rightMainScrollBorderX},
      ]
    );

    var mainScrollX = xFrom;
    var mainScrollWidth = xTo - xFrom;
    var mainScroll = this._createSVGElement(
      "rect",
      [
        {name: "id", value: this.mainScrollId},
        {name: "style", value: "outline-style: solid; outline-width: 2px; outline-offset: -2px;"},
        {name: "fill", value: "transparent"},
        {name: "height", value: this.scrollbarChartHeight},
        {name: "y", value: this.scrollbarStartY},
        {name: "x", value: mainScrollX},
        {name: "width", value: mainScrollWidth},
      ]
    );

    var bar = this._createSVGElement(
      "g",
      [
        {name: "id", value: this.scrollbarId},
      ]
    );

    bar.appendChild(mainScroll);
    bar.appendChild(leftScroll);
    bar.appendChild(rightScroll);
    bar.appendChild(leftMainScrollBorder);
    bar.appendChild(rightMainScrollBorder);
    
    this.svg.appendChild(bar);

    this._setScrollBarElements();
    this._setScrollBarEvents();
  }

  _addLineTooglerContainer() {
    var div = document.createElement("div");

    div.setAttribute("id", this.lineTooglerContainerId);

    this.chartContainer.appendChild(div);

    this.lineTooglerContainer = div;
  }

  _addToogleLines() {
    this.defaultY.forEach(y => {
      var inputId = this.checkboxLineId + y.name;

      var label = document.createElement("label");
      var input = document.createElement("input");
      var span1 = document.createElement("span");
      var span2 = document.createElement("span");

      label.setAttribute("class", "checkbox");

      input.setAttribute("class", "checkbox__input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("id", inputId);
      input.setAttribute("data-chart-name", y.name);

      if (this.allowedLines.indexOf(y.name) !== -1) {
        input.setAttribute("checked", "checked");
      }
      
      span1.setAttribute("class", "checkbox__icon");
      span1.setAttribute("style", "border-color: " + this.colors[y.name] + "; background-color: " + this.colors[y.name] + ";");

      span2.setAttribute("class", "checkbox__label");
      span2.innerText = this.names[y.name];

      label.appendChild(input);
      label.appendChild(span1);
      label.appendChild(span2);

      this.lineTooglerContainer.appendChild(label);

      input.addEventListener('click', this.toogleLine, false);
    });
  }

  _addPopupContainer() {
    var div = document.createElement("div");

    div.setAttribute("id", this.linePopupContainerId);

    this.chartContainer.appendChild(div);

    this.linePopupContainer = div;
  }
  
  //////////////// DISPLAY DATA IN POPUP ///////////////
  _showVerticalBarLine(x) {
    var d = "M " + x + " 0 L " + x + " " + this.mainChartHeight;
    var el = this._createSVGElement(
      "path",
      [
        {name: "class", value: "chart-vertical-line-data"},
        {name: "fill", value: "none"},
        {name: "stroke-width", value: 1},
        {name: "d", value: d},
      ]
    );

    this.lineBarDataContainer.appendChild(el);
  }
  _hideVerticalBarLine() {
    this.lineBarDataContainer.innerHTML = '';
  }

  _showChartDot(data) {
    for (var i = 0; i < data.length; i++) {
      var dot = data[i];

      var circle = this._createSVGElement(
        "circle",
        [
          {name: "id", value: dot.id + "_chart_dot"},
          {name: "class", value: "chart-dot-data"},
          {name: "stroke", value: this.colors[dot.lineName]},
          {name: "stroke-width", value: 2},
          {name: "cx", value: dot.dot[0]},
          {name: "cy", value: dot.dot[1]},
          {name: "r", value: 4},
        ]
      );

      this.lineBarDataContainer.appendChild(circle);
    }
  }
  _hideChartDot() {
    this.lineBarDataContainer.innerHTML = '';
  }

  _showDataPopup(e, data) {
    var dateObj = new Date(data[0].date);
    var day = this.formatDays[dateObj.getDay()];
    var month = this.formatMonth[dateObj.getMonth()];
    var date = dateObj.getDate();
    var fullDate = day + ", " + month + " " + date;

    var popup = document.createElement("div");
    var header = document.createElement("div");
    var body = document.createElement("div");

    popup.setAttribute("id", this.popupId);
    popup.setAttribute("class", "popup-chart-info");

    header.setAttribute("class", "popup-chart-header");
    header.textContent = fullDate;

    body.setAttribute("class", "popup-chart-body");

    for (var i = 0; i < data.length; i++) {
      var dot = data[i];

      var dotInfo = document.createElement("div");
      var dotHeader = document.createElement("div");
      var dotBody = document.createElement("div");

      dotInfo.setAttribute("class", "popup-chart-dot-info");
      dotInfo.setAttribute("style", "color: " + this.colors[dot.lineName]);

      dotHeader.setAttribute("class", "popup-chart-dot-header");
      dotHeader.textContent = dot.data;

      dotBody.setAttribute("class", "popup-chart-dot-body");
      dotBody.textContent = dot.name;

      dotInfo.appendChild(dotHeader);
      dotInfo.appendChild(dotBody);

      body.appendChild(dotInfo);
    }

    popup.appendChild(header);
    popup.appendChild(body);

    this.linePopupContainer.appendChild(popup);

    // set popup position
    var popupWidth = popup.getBoundingClientRect().width;

    var svgWidth = this.svgWidth;
    var currentSvgX = data[0].dot[0];
    
    var distanceBetweenMousePopup = 30;
    var mouseX = (svgWidth - currentSvgX - distanceBetweenMousePopup) <= popupWidth ? 
      e.pageX - popupWidth - distanceBetweenMousePopup: 
      e.pageX + distanceBetweenMousePopup;
    var mouseY = e.pageY - distanceBetweenMousePopup;

    popup.setAttribute("style", " left: " + mouseX + "px; top: " + mouseY + "px;");
  }
  _hideDataPopup() {
    this.linePopupContainer.innerHTML = '';
  }

  //////////////// DRAWER ///////////////
  _prepareLinePath(data, startY, xStep, yStep) {
    var d = "M " + 0 + " "; // 0 - Start chart from this point.

    data.forEach((value, index) => {
      var i = index + 1; // because the index starts from 0 and the second point of data draw on the Y axis. It's not true.
      var x = i * xStep;
      var y = startY - value * yStep; // this.svgHeight

      if (i == data.length) { // add Y data only, beacause it the end of data
        d += y;
        return true;
      }

      d += y + " L " + x + " ";
    });

    return d;
  }
  
  _clearVerticalBar() {
    this.lineBarContainer.innerHTML = "";
  }
  _drawVerticalBar(dataX, dataY, startY) {
    if (this.lineBarContainer.innerHTML != "")  return;

    var self = this;

    var xStep = this.xMainStep;
    var yStep = this.yMainStep;

    // перед тем, как добавить новые бары, удаляем все предыдущие бары
    this.lineBarContainer.innerHTML = "";

    // добавляем новые бары
    for (var i=0; i < dataX.length; i++) {
      var x = i * xStep - xStep / 2;
      var barLineX = i * xStep;
      var id = this.svgId + "_" + dataX[i];
      var linesData = [];

      for (var j=0; j < dataY.length; j++) {
        var line = dataY[j];

        if (!this._isLineAllowed(line.name)) continue;

        var y = startY - line.data[i] * yStep;
        var data = {
          id: id + "_" + line.name,
          lineName: line.name,
          name: self.names[line.name],
          data: line.data[i],
          date: dataX[i],
          dot: [barLineX, y]
        }

        linesData.push(data);
      }

      var bar = this._createSVGElement(
        "rect",
        [
          {name: "id", value: id},
          {name: "fill", value: "rgba(255, 255, 255, 0)"},
          {name: "height", value: this.mainChartHeight},
          {name: "y", value: 0},
          {name: "x", value: x},
          {name: "width", value: xStep},
          {name: "data-lines-data", value: JSON.stringify(linesData)}
        ]
      );
  
      this.lineBarContainer.appendChild(bar);

      bar.addEventListener('mouseover', function(e) {
        // не выполнять скрипт, если нажата кнопка мыши
        if (e.buttons > 0) return;

        var currentBar = e.target;
        var data = JSON.parse(currentBar.dataset.linesData);

        if (!data.length) return;
        
        self._showVerticalBarLine(data[0].dot[0]);
        self._showChartDot(data);
        self._showDataPopup(e, data);
      }, false);

      bar.addEventListener('mouseleave', function(e) {
        // не выполнять скрипт, если нажата кнопка мыши
        if (e.buttons > 0) return;

        var currentBar = e.target;
        var data = JSON.parse(currentBar.dataset.linesData);

        if (!data.length) return;

        self._hideVerticalBarLine();
        self._hideChartDot();
        self._hideDataPopup();
      }, false);
    }
  }
  _drawLine(id, d, color, strokeWidth) {
    var line = document.getElementById(id);

    if (line) { // if line exists - update D attribute
      line.setAttribute('d', d);
      return;
    }

    // if line does not exists - create it
    var path = this._createSVGElement(
      "path",
      [
        {name: "id", value: id},
        {name: "d", value: d},
        {name: "stroke", value: color},
        {name: "stroke-width", value: strokeWidth},
        {name: "fill", value: "transparent"},
      ]
    );

    this.linesContainer.appendChild(path);
  }
  _drawLines(y, startY, isMain = true) {
    var self = this;

    var xStep = isMain ? this.xMainStep : this.xBarStep;
    var yStep = isMain ? this.yMainStep : this.yBarStep;

    // draw lines y0, y1 ...
    y.forEach(line => {
      var id = isMain ? this.mainLinePrefixId + line.name : this.scrollbarLinePrefixId + line.name;
      var d = this._isLineAllowed(line.name) ? this._prepareLinePath(line.data, startY, xStep, yStep) : "";
      var color = this.colors[line.name];
      var strokeWidth = isMain ? 2 : 1;
      
      self._drawLine(id, d, color, strokeWidth);
    });
  }

  _drawDates(x) {
    var xStep = this.xMainStep;

    var currentRange = x;
    var defaultRange = this.defaultX;
    var maxDatesOnScreen = this.maxDatesOnScreen;
    var stepDate = ~~(currentRange.length/maxDatesOnScreen);
    var resultEveneRange = defaultRange.filter((date, i) => {
      if (!(i % stepDate)) {
        return date;
      }
    });

    // clear all dates
    var blockDays = document.getElementById(this.xAxisId);
    blockDays.innerHTML = "";
    
    // draw new dates
    x.forEach((timestamp, index) => {
      if (resultEveneRange.indexOf(timestamp) === -1) return;

      var i = index;
      var x = i * xStep;
      var dateObj = new Date(timestamp);
      var month = this.formatMonth[dateObj.getMonth()];
      var date = dateObj.getDate();
      var fullDate = month + " " + date;

      var textNode = this._createSVGElement(
        "text",
        [
          {name: "text-anchor", value: "middle"},
          {name: "y", value: this.mainChartHeight + 20},
          {name: "x", value: x},
        ],
        false
      );
      textNode.textContent = fullDate;
  
      blockDays.appendChild(textNode);
    });
  }

  _drawData(y, height, startY) {
    var yDataHeight = 0;
    y.forEach((y) => {
      if (this.allowedLines.indexOf(y.name) === -1) return;

      var heightY = Math.max.apply(null, y.data);

      yDataHeight = (heightY > yDataHeight) ? heightY : yDataHeight;
    });
  
    if (yDataHeight == this.maxDataHeightY) return;

    var cssclass = yDataHeight > this.maxDataHeightY ? "up" : "down";

    this.maxDataHeightY = yDataHeight;

    var dataBlock = document.getElementById(this.yAxisId);

    var maxDataLinesOnScreen = this.maxDataLinesOnScreen;
    var linesStep = ~~(height / maxDataLinesOnScreen); // in pixels

    var dataStep = yDataHeight / maxDataLinesOnScreen;
    
    dataBlock.innerHTML = "";
    
    for (var i = 0; i < maxDataLinesOnScreen; i++) {
      var lineY = startY - i * linesStep;
      var lineWidth = this.svgWidth;
      var lineD = "M 0 " + lineY + " L " + lineWidth + " " + lineY;
      var lineNode = this._createSVGElement(
        "path",
        [
          {name: "class", value: (i > 0 ? cssclass : "")},
          {name: "fill", value: "none"},
          {name: "stroke-width", value: 1},
          {name: "data-z-index", value: 1},
          {name: "d", value: lineD},
        ]
      );

      var dataY = Math.trunc(i * dataStep);
      var lineDataNode = this._createSVGElement(
        "text",
        [
          {name: "class", value: (i > 0 ? cssclass : "")},
          {name: "y", value: lineY - 5},
          {name: "x", value: 0},
        ]
      );
      lineDataNode.textContent = dataY;
  
      dataBlock.appendChild(lineNode);
      dataBlock.appendChild(lineDataNode);
    }
  }
  
  _drawMainChart() {
    this._drawLines(this.y, this.mainChartStartY, true);

    this._drawDates(this.x);

    this._drawData(this.y, this.mainChartHeight, this.mainChartStartY);
  }

  _drawBarChart() {
    this._drawLines(this.defaultY, this.scrollbarChartStartY, false);
  }
  
  /////////////////////////////////  PUBLIC METHODS  ////////////////////////////////////
  create() {
    this._prepareData();

    this._addChartContainer();
    this._addChartName();
    this._addSvg();
    this._addXYAxises();
    this._addLinesContainer();
    this._addLineBarDataContainer();
    this._addLineBarContainer();
    this._addScrollBar();
    this._addLineTooglerContainer();
    this._addToogleLines();
    this._addPopupContainer();

    this._updateCountItemsInRange(); 
    this._updateDataByRange(); 
    
    this._calculateXYStepForMainChart(); 
    this._calculateXYStepForBarChart();

    this._drawVerticalBar(this.x, this.y, this.mainChartStartY);

    this._drawMainChart();
    this._drawBarChart(); 
  }
}