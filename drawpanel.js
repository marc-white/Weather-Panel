function radians(degrees) {
	// Convert degrees to radians

	rads = degrees * Math.PI/180.0;
	return rads
}

function weatherPanel(telescopeMet) {
	// Object to control the drawing of the weather panel

	this.telescopeMet = telescopeMet;

	// Object attributes are stored here
	// Object methods are in the .prototype definition
	this.svgwidth = 660;
	// this.svgheight = 220;
	// this.aspect = this.svgwidth / this.svgheight;
	// Alternatively:
	this.aspect = 3.0;
	this.svgheight = this.svgwidth/this.aspect;
	this.svgwidthDimless = 100;
	this.svgheightDimless = this.svgwidthDimless;
	this.xScale = d3.scale.linear()
						.domain([0,this.svgwidthDimless])
						.range([0,this.svgwidth])
						.clamp(true);
	this.yScale = d3.scale.linear()
						.domain([0,this.svgheightDimless])
						.range([0,this.svgheight])
						.clamp(true);


	this.strokeWidth = 2.0; // pixel units
	this.MasterTextHeight = 7.5;
	this.UnitsTextHeight = 5;  // dimensionless y-units
	this.BGColor = d3.rgb(240,240,240);
	this.ColorNull = 'darkgray';

	this.transitionDuration = 900;

	this.minTemp = -10.0;
	this.maxTemp = 40.0;
	this.rangeTemp = this.maxTemp - this.minTemp;
	this.minTempLength = 30.0; // dimensionless x-units
	this.maxTempLength = 77.0 ;// dimensionless x-units
	this.TempGaps = 3 ;        // dimensionless y-units
	this.TempHeight = (this.svgheightDimless - 6*this.TempGaps)/5.0 ;   // dimensionless y-units
	this.TempOffset = 1 ;      // dimensionless x-units
	this.TempTextOffset = 1;
	this.TextFudgeFactor = 1;

	this.TempColorScale = d3.scale.linear().domain([this.minTemp, 
													this.minTemp+0.25*this.rangeTemp,
													this.minTemp+0.50*this.rangeTemp,
													this.minTemp+0.75*this.rangeTemp, 
													this.maxTemp])
										   .range(["deepskyblue", "powderblue", "khaki", "gold", "orangered"])
										   .clamp(true);

	this.xScaleTemp = d3.scale.linear().domain([this.minTemp,this.maxTemp])
										.range([this.minTempLength, this.maxTempLength])
										.clamp(true);
	this.xScaleNull = this.xScaleTemp(this.minTemp);

	this.BoxWidth = 30.0;
	this.BoxHeight = this.TempHeight;
	this.BoxSpacing = 8.0;
	this.BoxCornerX = 1.0;
	this.BoxCornerY = this.BoxCornerX * this.aspect;
	this.BoxTextY = this.svgheightDimless-this.TempGaps - this.TempHeight/2.0 +this.MasterTextHeight/2.0 - this.TextFudgeFactor;
	this.CondsColor = "blue";
	this.ShttrColor = "darkgreen";
	this.ShttrFaultColor = "red";

	// this.WindCenterX = 81.5 // dimensionless x-units
	this.WindCenterX = 85.0
	this.WindCenterY = 40.0 // dimensionless y-units
	this.WindRadius = 15.0  // dimensionless y-units
	this.WindArrowLength = 12.0 // dimensionless y-units 
	this.WindLabelOffset = 2.0  // dimensionless y-units

	this.HumidOffset = this.svgwidthDimless - (this.TempHeight/this.aspect) - this.TempOffset; // dimensionless x-units
	this.HumidGaps = this.TempGaps // dimensionless y-units
	this.maxHumid = 100.0
	this.minHumid = 0.0
	this.minHumidLength = 60.0 // dimensionless y-units
	this.maxHumidLength = this.svgheightDimless - (2.0*this.TempGaps);

	this.yScaleHumid = d3.scale.linear().domain([this.minHumid,this.maxHumid])
										.range([this.minHumidLength,this.maxHumidLength])
										.clamp(true);
	this.HumidColorScale = d3.scale.linear().domain([this.minHumid,this.maxHumid])
											.range(["lightsteelblue", "lightskyblue"])
											.clamp(true);

	this.initialisePanel();

	if (debugmode) { console.debug('xScale of 50.0: ',this.xScale(50.0));
					 console.debug('xScale of 110.0: ',this.xScale(110.0));
					 console.debug('yScale of 50.0: ',this.yScale(50.0));
					 console.debug('yScale of -10.0: ',this.yScale(-10.0)); }

	return this;
}

weatherPanel.prototype = {
	// Basic definitions
	templabelstext: ["EXTERNAL", "INTERNAL", "MIRROR", "DEWPOINT"],
	startTimer: function (interval) {
		this.reloadTimer = setInterval(function () {
			this.telescopeMet.updateData(function () {
				this.updatePanel();
			}.bind(this))
		}.bind(this), interval)
	},
	stopTimer: function () {
		var that = this;
		clearInterval(that.reloadTimer);
		return this;
	},
	// Helper functions
	returnWindValue: function (windspd) {
		if (windspd != null) {
			return windspd.toFixed(1)
		} else {
			return '—'
		}
	},
	returnWindDir: function (winddir) {
		if (winddir != null) {
			return winddir.toFixed(0)+"°"
		} else {
			return '—'+"°"
		}
	},
	returnWindDirAngle: function (winddir) {
		if (winddir != null) {
			return winddir - 90;
		} else {
			return 0;
		}
	},
	returnWindArrowTransform: function (winddir) {
		return 'rotate('+(String(winddir) || String(0))+' '+String(this.xScale(this.WindCenterX))+' '+String(this.yScale(this.WindCenterY))+')';
	},
	computeHumidBarPosition: function (humidheight) {
		var HumidBarPosn = this.svgheightDimless - this.TempGaps - humidheight;
		return HumidBarPosn;
	},
	returnHumidBarColor: function (humid) {
		if (humid != null) {
			return this.HumidColorScale(humid);
		} else {
			return this.ColorNull;
		}
	},
	returnHumidBarValue: function (humid) {
		if (humid != null) {
			return humid.toFixed(0)+'%';
		} else {
			return '—';
		}
	},
	returnTempBarLength: function (temp) {
		if (temp != null) {
			return this.xScaleTemp(temp);
		} else {
			return this.xScaleTemp(this.minTemp); 
		}
	},
	returnTempBarValue: function (temp) {
		if (temp != null) {
			return temp.toFixed(1)+'°C';
		} else {
			return '—';
		}
	},
	returnTempBarColor: function (temp) {
		if (temp != null) {
			return this.TempColorScale(temp)
		} else {
			return this.ColorNull;
		}
	},
	returnCondsValue: function (conds) {
		if (conds != null) {
			return conds.replace('_', ' ');
		} else {
			return 'RAIN SENSOR ERROR';
		}
	},
	returnCondsFillColor: function (conds) {
		if (conds == null) {
			return this.ColorNull;
		} else {
			if (this.telescopeMet.telescope == '2.3') {
				if (conds == 'NOT_RAINING') { return this.BGColor; }
				else { return this.CondsColor; }
			} else if (this.telescopeMet.telescope == 'SM') {
				if (conds == 'CLEAR') { return this.BGColor; }
				else { return this.CondsColor; }
			}
		}
	},
	returnCondsStrokeColor: function (conds) {
		if (conds == null) {
			return this.ColorNull;
		} else {
			return this.CondsColor;
		}
	},
	returnCondsLabelColor: function (conds) {
		if (conds == null) {
			return 'black';
		} else {
			if (this.telescopeMet.telescope == '2.3') {
				if (conds == 'NOT_RAINING') { return this.CondsColor; }
				else { return 'white'; }
			} else if (this.telescopeMet.telescope == 'SM') {
				if (conds == 'CLEAR') { return this.CondsColor; }
				else { return 'white'; }
			}
		} 
	},
	returnShttrValue: function (shttr) {
		if (shttr == null) {
			return 'SHTR. SENSOR ERROR';
		} else {
			return 'SHUTTER '+shttr.replace('_', ' ').substring(0,10);
		}
	},
	returnShttrStrokeColor: function (shttr, conds) {
		if (shttr == null) {
			return this.ColorNull;
		} else if (shttr == 'FAULT') { 
			return this.ShttrFaultColor; 
		} else if ((shttr != 'CLOSED') 
			       && ((conds == 'RAINING') || (conds == 'NO_OBSERVING'))) {
			return this.ShttrFaultColor;
		} else {
			return this.ShttrColor;
		}
	},
	returnShttrFillColor: function (shttr, conds) {
		if (shttr == null) { 
			return this.ColorNull; 
		} else if (shttr == 'FAULT') { 
			return this.ShttrFaultColor; 
		} else if ((shttr != 'CLOSED') 
			       && ((conds == 'RAINING') || (conds == 'NO_OBSERVING'))) {
			return this.ShttrFaultColor;
		} else if ((shttr == 'CLOSED') 
				   || (shttr == 'DISABLED')
				   || (shttr == 'INDETERMINATE')) { 
			return this.BGColor; 
		} else { 
			return this.ShttrColor 
		}
	},
	returnShttrLabelColor: function (shttr, conds) {
		var currentFill = this.returnShttrFillColor(shttr,conds);
		if      (currentFill == this.BGColor)   { return this.ShttrColor }
	 	else if (currentFill == this.ColorNull) { return 'black' }
	 	else 									{ return 'white' }
	},
	// Function to do the initial panel draw
	initialisePanel: function () {
		this.svg = d3.select("svg#weatherpane")
					.attr("width", this.svgwidth)
					.attr("height", this.svgheight);
		// Render background
		this.svgbg = this.svg.append("rect")
							.attr("x", 0)
							.attr("y", 0)
							.attr("width", this.svgwidth)
							.attr("height", this.svgheight)
							.style("fill", this.BGColor);
		// Insert wind circle
		this.windcircle = this.svg.append("circle")
								.attr("cx", this.xScale(this.WindCenterX))
								.attr("cy", this.yScale(this.WindCenterY))
								.attr("r", this.yScale(this.WindRadius))
								.style("fill", "none")
								.style("stroke", "black")
								.style("stroke-width", function() {return this.strokeWidth}.bind(this));
		this.windarrow = this.svg.append("line")
								.attr("x1", function() {return this.xScale(this.WindCenterX)}.bind(this))
								.attr("y1", function() {return this.yScale(this.WindCenterY)}.bind(this))
								.attr("x2", function() {return this.xScale(this.WindCenterX)}.bind(this))
								.attr("y2", function() {
									return (this.yScale(this.WindCenterY))
								}.bind(this))
								.style("stroke", "black")
								.style("stroke-width", function() {return this.strokeWidth}.bind(this))
								// .style("marker-end", "url(#triangle)")
		this.windvalue = this.svg.append("text")
								.attr("class", "windvalue")
								.attr("x", function() {return this.xScale(this.WindCenterX)}.bind(this))
								.attr("y", function() {
									return this.yScale(this.WindCenterY+this.WindRadius+this.WindLabelOffset+this.MasterTextHeight)
								}.bind(this))
								.text(function() { return this.returnWindValue(null)}.bind(this))
								.style("fill", "black")
								.style('text-anchor', 'middle')
								.attr("font-size", function() {
										return this.yScale(this.MasterTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.attr("text-anchor", "start");
		this.windunits = this.svg.append("text")
								.attr("class", "windunits")
								.attr("x", function() {return this.xScale(this.WindCenterX)}.bind(this))
								.attr("y", function() {
									return this.yScale(this.WindCenterY+this.WindRadius
													   +(this.TempGaps)+this.MasterTextHeight+this.UnitsTextHeight)
								}.bind(this))
								.text('m/s')
								.style("fill", "black")
								.style('text-anchor', 'middle')
								.attr("font-size", function() {
										return this.yScale(this.UnitsTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.attr("text-anchor", "start");
		var winddirinit = null;
		this.winddir = this.svg.append("text")
								.attr("class", "winddir")
								.attr("x", function() {
									return this.xScale(this.WindCenterX)
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.WindCenterY - this.WindRadius - this.WindLabelOffset - (2*this.TextFudgeFactor))
								}.bind(this))
								.text(function() { return this.returnWindDir(null)}.bind(this))
								.attr('text-anchor', 'middle')
								.style("fill", "black")
								.style('text-anchor', 'middle')
								.attr("font-size", function() {
										return this.yScale(this.MasterTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif");
		this.windlabel = this.svg.append("text")
								.attr("class", "windlabel")
								.attr("x", function() {
									return this.xScale(this.WindCenterX)
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.WindCenterY - this.WindRadius 
													   - this.WindLabelOffset - (3*this.TextFudgeFactor) - this.MasterTextHeight)
								}.bind(this))
								.text('WIND')
								.attr('text-anchor', 'middle')
								.style("fill", "black")
								.style('text-anchor', 'middle')
								.attr("font-size", function() {
										return this.yScale(this.UnitsTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif");
		var tempbarsinit = [null, null, null, null];
		// var tempbarsinit = [this.minTemp, 
		// 					this.minTemp + 0.5*this.rangeTemp, 
		// 					this.minTemp + 0.99*this.rangeTemp, 
		// 					null];
		this.tempbars = this.svg.selectAll("rect.tempbar")
								.data(tempbarsinit)
								.enter()
								.append("rect")
								.attr("class", "tempbar")
								.attr("x", function() {
									return this.xScale(this.TempOffset)
								}.bind(this))
								.attr("y", function(d,i) {
									return this.yScale(((this.TempGaps+this.TempHeight)*i)+this.TempGaps)
								}.bind(this))
								.attr("height", function() {
									return this.yScale(this.TempHeight)
								}.bind(this))
								.attr("width", function(d) {
									// return this.xScale(this.xScaleTemp(d))
								// }.bind(this))
									return this.xScale(this.returnTempBarLength(d))
								}.bind(this))
								.style("fill", function(d) {
									return this.returnTempBarColor(d)
								}.bind(this))
								.style("stroke", "none")
		this.templabels = this.svg.selectAll("text.templabels")
									.data(this.templabelstext)
									.enter()
									.append("text")
									.attr("class", "templabels")
									.text(function(d) { return d })
									.attr("x", function() {
										return this.xScale(this.TempOffset+this.TempTextOffset)
									}.bind(this))
									.attr("y", function(d,i) {
										return this.yScale((i+1)*this.TempGaps + (i+0.5)*this.TempHeight + this.MasterTextHeight/2.0 - this.TextFudgeFactor)
									}.bind(this))
									.attr("text-anchor", "left")
									.attr("font-size", function() {
										return this.yScale(this.MasterTextHeight);
									}.bind(this))
									.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif");
		this.tempvalues = this.svg.selectAll("text.tempvalues")
									.data(tempbarsinit)
									.enter()
									.append("text")
									.attr("class", "tempvalues")
									.text(function(d) { return this.returnTempBarValue(d); }.bind(this))
									.attr("x", function(d) {
										return this.xScale(this.returnTempBarLength(d))
									}.bind(this))
									.attr("y", function(d,i) {
										return this.yScale((i+1)*this.TempGaps + (i+0.5)*this.TempHeight + this.MasterTextHeight/2.0 - this.TextFudgeFactor)
									}.bind(this))
									.attr("text-anchor", "end")
									.attr("font-size", function() {
										return this.yScale(this.MasterTextHeight);
									}.bind(this))
									.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif");
		var humidinit = null;
		this.humidbar = this.svg.append("rect")
								.attr("class", "humidbar")
								.attr("x", function() {
									return this.xScale(this.HumidOffset)
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.computeHumidBarPosition(this.yScaleHumid(humidinit)))
								}.bind(this))
								.attr("width", function() {
									return this.xScale(this.TempHeight / this.aspect)
								}.bind(this))
								.attr("height", function() {
									return this.yScale(this.yScaleHumid(humidinit))
								}.bind(this))
								.style("fill", function () {
									return this.returnHumidBarColor(humidinit)
								}.bind(this))
								.style("stroke", "none");
		this.humidlabel = this.svg.append("text")
								.attr("class", "humidlabel")
								.attr("x", function() {
									return this.xScale(this.HumidOffset + (this.TempHeight/this.aspect)/2.0 + (this.MasterTextHeight/this.aspect)/2.0 - (this.TextFudgeFactor/this.aspect))
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.svgheightDimless-this.TempGaps-(this.TempTextOffset*this.aspect))
								}.bind(this))
								.attr("transform", "rotate(270 "+String(this.xScale(this.HumidOffset + (this.TempHeight/this.aspect)/2.0 + (this.MasterTextHeight/this.aspect)/2.0 - (this.TextFudgeFactor/this.aspect)))+" "+String(this.yScale(this.svgheightDimless-this.TempGaps-(this.TempTextOffset*this.aspect)))+")")
								.text('HUMIDITY')
								.attr("font-size", function() {
										return this.yScale(this.MasterTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.attr("text-anchor", "start");
		// this.humidMarker = this.svg.append("circle")
		// 						.attr("class", "mark")
		// 						.attr("cx", function() {
		// 							return this.xScale(this.HumidOffset + (this.TempHeight/this.aspect)/2.0 + (this.MasterTextHeight/this.aspect)/2.0 - (this.TextFudgeFactor/this.aspect))
		// 						}.bind(this))
		// 						.attr("cy", function() {
		// 							return this.yScale(this.computeHumidBarPosition(this.yScaleHumid(humidinit)) + this.TempGaps)
		// 						}.bind(this))
		// 						.attr("r", 3)
		// 						.style("fill", "red")
		this.humidvalue = this.svg.append("text")
								.attr("class", "humidvalue")
								.attr("x", function() {
									return this.xScale(this.HumidOffset + (this.TempHeight/this.aspect)/2.0 + (this.MasterTextHeight/this.aspect)/2.0 - (this.TextFudgeFactor/this.aspect))
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.computeHumidBarPosition(this.yScaleHumid(humidinit)) + this.TempGaps)
								}.bind(this))
								.attr("transform", "rotate(270 "+String(this.xScale(this.HumidOffset + (this.TempHeight/this.aspect)/2.0 + (this.MasterTextHeight/this.aspect)/2.0 - (this.TextFudgeFactor/this.aspect)))+" "+String(this.yScale(this.computeHumidBarPosition(this.yScaleHumid(humidinit)) + this.TempGaps))+")")
								.text(function() { return this.returnHumidBarValue(humidinit)}.bind(this))
								.attr("font-size", function() {
										return this.yScale(this.MasterTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.attr("text-anchor", "end");
		this.condsbox = this.svg.append("rect")
								.attr("class", "condsbox")
								.attr("x", function() {
									return this.xScale(this.TempOffset)
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.svgheightDimless-this.TempHeight-this.TempGaps)
								}.bind(this))
								.attr("width", function() {
									return this.xScale(this.BoxWidth)
								}.bind(this))
								.attr("height", function() {
									return this.yScale(this.BoxHeight)
								}.bind(this))
								.attr("rx", function() {
									return this.xScale(this.BoxCornerX)
								}.bind(this))
								.attr("ry", function() {
									return this.yScale(this.BoxCornerY)
								}.bind(this))
								.style("fill", this.BGColor)
								.style("stroke", this.CondsColor)
								.style("stroke-width", this.strokeWidth);
		// this.condsmarker = this.svg.append("circle")
		// 						.attr("cx", function() {
		// 							return this.xScale(this.TempOffset + 0.5*this.BoxWidth)
		// 						}.bind(this))
		// 						.attr("cy", function() {
		// 							return this.yScale(this.svgheightDimless-this.TempGaps - this.TempHeight/2.0 +this.MasterTextHeight/2.0 - this.TextFudgeFactor)
		// 						}.bind(this))
		// 						.attr("r", 3)
		// 						.style("fill", "red");
		this.condslabel = this.svg.append("text")
								.attr("class", "condslabel")
								.attr("x", function() {
									return this.xScale(this.TempOffset + 0.5*this.BoxWidth)
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.BoxTextY)
								}.bind(this))
								.text('')
								.style('text-anchor', 'middle')
								.attr("font-size", function() {
									return this.yScale(this.MasterTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.attr("text-anchor", "start")
								.style('font-stretch', 'ultra-condensed')
								.style("fill", this.CondsColor);
		this.shttrbox = this.svg.append("rect")
								.attr("class", "shttrbox")
								.attr("x", function() {
									return this.xScale(this.TempOffset*2 + this.BoxWidth)
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.svgheightDimless-this.TempHeight-this.TempGaps)
								}.bind(this))
								.attr("width", function() {
									return this.xScale(this.BoxWidth)
								}.bind(this))
								.attr("height", function() {
									return this.yScale(this.BoxHeight)
								}.bind(this))
								.attr("rx", function() {
									return this.xScale(this.BoxCornerX)
								}.bind(this))
								.attr("ry", function() {
									return this.yScale(this.BoxCornerY)
								}.bind(this))
								.style("fill", this.BGColor)
								.style("stroke", this.ShttrColor)
								.style("stroke-width", this.strokeWidth);
		this.shttrlabel = this.svg.append("text")
								.attr("class", "shttrlabel")
								.attr("x", function() {
									return this.xScale(2*this.TempOffset + 1.5*this.BoxWidth)
								}.bind(this))
								.attr("y", function() {
									return this.yScale(this.BoxTextY)
								}.bind(this))
								.text('')
								.style('text-anchor', 'middle')
								.attr("font-size", function() {
									return this.yScale(this.MasterTextHeight);
								}.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.style("fill", this.ShttrColor);
		this.timelabel = this.svg.append("text")
								.attr("class", "timelabel")
								.attr("x", function() {
									return this.xScale((this.TempOffset*2 + 2*this.BoxWidth + this.HumidOffset)/2.0);
								}.bind(this))
								.attr("y", this.yScale(this.BoxTextY))
								// .text(function () { return this.telescopeMet.metdata.obsdt}.bind(this))
								.text('')
								.style('text-anchor', 'middle')
								.attr("font-size", function() { return this.yScale(this.MasterTextHeight) }.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.style("fill", "black");
		this.timeunits = this.svg.append("text")
								.attr("class", "timeunits")
								.attr("x", function() {
									return this.xScale((this.TempOffset*2 + 2*this.BoxWidth + this.HumidOffset)/2.0);
								}.bind(this))
								.attr("y", this.yScale(this.BoxTextY - this.MasterTextHeight - this.TextFudgeFactor))
								.text('Correct as at UTC')
								.style('text-anchor', 'middle')
								.attr("font-size", function() { return this.yScale(this.UnitsTextHeight) }.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.style("fill", "black");
		this.timeoffset = this.svg.append("text")
								.attr("class", "timeoffset")
								.attr("x", function() {
									return this.xScale((this.TempOffset*2 + 2*this.BoxWidth + this.HumidOffset)/2.0);
								}.bind(this))
								.attr("y", this.yScale(this.BoxTextY + this.MasterTextHeight - this.TextFudgeFactor))
								.text('You are UTC'+this.telescopeMet.utcoffset)
								.style('text-anchor', 'middle')
								.attr("font-size", function() { return this.yScale(this.UnitsTextHeight) }.bind(this))
								.attr("font-family", "Lucida Sans Unicode, Tahoma, Geneva, sans-serif")
								.style("fill", "black");
		return this;
	},
	updatePanel: function () {
		// Update the printed date & time
		this.timelabel
			.transition().duration(this.transitionDuration)
			.text(this.telescopeMet.metdata.obsdt);
		// Update the temperature information
		this.tempbars
			.data(this.telescopeMet.metdata.temps)
			.transition()
			.duration(this.transitionDuration)
			.attr("width", function(d) {
				// return this.xScale(this.xScaleTemp(d))
			// }.bind(this))
				if (debugmode) { console.debug('Inside tempbar updatePanel'); }
				return this.xScale(this.returnTempBarLength(d.value))
			}.bind(this))
			.style("fill", function(d) {
				return this.returnTempBarColor(d.value)
			}.bind(this));
		// Update the printed temperature values
		this.tempvalues
			.data(this.telescopeMet.metdata.temps)
			.transition().duration(this.transitionDuration)
			.text(function(d) { return this.returnTempBarValue(d.value); }.bind(this))
			.attr("x", function(d) {
				return this.xScale(this.returnTempBarLength(d.value))
			}.bind(this));
		// Update the humidity bar
		this.humidbar
			.transition().duration(this.transitionDuration)
			.attr("y", function() {
				if (debugmode) { console.debug('Update humindbar length'); }
				return this.yScale(this.computeHumidBarPosition(this.yScaleHumid(this.telescopeMet.metdata.humid)))
			}.bind(this))
			.attr("height", function() {
				return this.yScale(this.yScaleHumid(this.telescopeMet.metdata.humid))
			}.bind(this))
			.style("fill", function () {
				return this.returnHumidBarColor(this.telescopeMet.metdata.humid)
			}.bind(this))
		// Update the printed humidity value
		this.humidvalue
			.transition().duration(this.transitionDuration)
			.attr("x", function() {
				return this.xScale(this.HumidOffset + (this.TempHeight/this.aspect)/2.0 + (this.MasterTextHeight/this.aspect)/2.0 - (this.TextFudgeFactor/this.aspect))
			}.bind(this))
			.attr("y", function() {
				return this.yScale(this.computeHumidBarPosition(this.yScaleHumid(this.telescopeMet.metdata.humid)) + this.TempGaps)
			}.bind(this))
			.attr("transform", "rotate(270 "+String(this.xScale(this.HumidOffset + (this.TempHeight/this.aspect)/2.0 + (this.MasterTextHeight/this.aspect)/2.0 - (this.TextFudgeFactor/this.aspect)))+" "+String(this.yScale(this.computeHumidBarPosition(this.yScaleHumid(this.telescopeMet.metdata.humid)) + this.TempGaps))+")")
			.text(function() { return this.returnHumidBarValue(this.telescopeMet.metdata.humid)}.bind(this));
		// Re-draw the wind arrow
		if (this.telescopeMet.metdata.windd == null) {
			this.windarrow.attr('visibility', 'hidden')
		} else {
			this.windarrow.attr('visibility', 'visible')
		}
		this.windarrow
			.transition().duration(this.transitionDuration)
			.attr("x2", function() {return this.xScale(this.WindCenterX + this.WindArrowLength*Math.sin(radians(this.telescopeMet.metdata.windd))/this.aspect) || this.xScale(this.WindCenterX)}.bind(this))
			.attr("y2", function() {
				return (this.yScale(this.WindCenterY-this.WindArrowLength*Math.cos(radians(this.telescopeMet.metdata.windd)))) || this.yScale(this.WindCenterY-this.WindArrowLength)
			}.bind(this));
			// .attr('transform', this.returnWindArrowTransform(this.telescopeMet.metdata.windd))
		// Update the wind speed value
		this.windvalue
			.transition().duration(this.transitionDuration)
			.text(this.returnWindValue(this.telescopeMet.metdata.winds));
		// Move the wind speed and wind units to where they won't clash with the arrow
		// if ((this.telescopeMet.metdata.windd > 90) && (this.telescopeMet.metdata.windd < 270)) {
		// 	this.windvalue.transition().duration(this.transitionDuration)
		// 		.attr("y", function() {
		// 			return this.yScale(this.WindCenterY-this.WindLabelOffset-this.MasterTextHeight)
		// 		}.bind(this))
		// 	this.windunits.transition().duration(this.transitionDuration)
		// 		.attr("y", function() {
		// 			return this.yScale(this.WindCenterY-1.5*this.WindLabelOffset+this.MasterTextHeight-this.UnitsTextHeight)
		// 		}.bind(this))
		// } else {
		// 	this.windvalue.transition().duration(this.transitionDuration)
		// 		.attr("y", function() {
		// 			return this.yScale(this.WindCenterY+this.WindLabelOffset+this.MasterTextHeight)
		// 		}.bind(this))
		// 	this.windunits.transition().duration(this.transitionDuration)
		// 		.attr("y", function() {
		// 			return this.yScale(this.WindCenterY+1.5*this.WindLabelOffset+this.MasterTextHeight+this.UnitsTextHeight)
		// 		}.bind(this))
		// }
		// Update the wind direction value
		this.winddir
			.transition().duration(this.transitionDuration)
			.text(this.returnWindDir(this.telescopeMet.metdata.windd));
		// Move the wind direction label as appropriate
		// if ((this.telescopeMet.metdata.windd > 180) && (this.telescopeMet.metdata.windd < 360)) {
		// 	this.winddir.transition().duration(this.transitionDuration).attr("x", function() {
		// 		return this.xScale(this.WindCenterX + this.WindRadius/this.aspect/2.0)
		// 	}.bind(this))
		// } else if (this.telescopeMet.metdata.windd == null) {
		// 	this.winddir.transition().duration(this.transitionDuration).attr("x", function() {
		// 		return this.xScale(this.WindCenterX)
		// 	}.bind(this))
		// } else {
		// 	this.winddir.transition().duration(this.transitionDuration).attr("x", function() {
		// 		return this.xScale(this.WindCenterX - this.WindRadius/this.aspect/2.0)
		// 	}.bind(this))
		// }
		// Update the rain/conditions state button
		this.condslabel.transition().duration(this.transitionDuration)
			.text(this.returnCondsValue(this.telescopeMet.metdata.conds))
			.style("fill", this.returnCondsLabelColor(this.telescopeMet.metdata.conds));
		this.condsbox.transition().duration(this.transitionDuration)
			.style("fill", this.returnCondsFillColor(this.telescopeMet.metdata.conds))
			.style("stroke", this.returnCondsStrokeColor(this.telescopeMet.metdata.conds))	
		// Update the shutter state box
		this.shttrlabel.transition().duration(this.transitionDuration)
			.text(this.returnShttrValue(this.telescopeMet.metdata.shttr))
			.style("fill", this.returnShttrLabelColor(this.telescopeMet.metdata.shttr, this.telescopeMet.metdata.conds));
		this.shttrbox.transition().duration(this.transitionDuration)
			.style("stroke", this.returnShttrStrokeColor(this.telescopeMet.metdata.shttr, this.telescopeMet.metdata.conds))
			.style("fill", this.returnShttrFillColor(this.telescopeMet.metdata.shttr, this.telescopeMet.metdata.conds));
	}
}


