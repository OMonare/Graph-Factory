/**
*     
*   @author: Onalenna Monare, Hermenegildo Isaias
*   @name: graphFactoryService
*   @description: the Graph Factory Service is an angular js service that encapsulates all the graph creation logic
*   @limitations: singular series data sets
*
*   Graph types (currently) supported:
*   Pie
*   Doughnut
*   Mulitbar Horizontal
*   Discrete Bar
*
*   Source for 'd3' charts info, along with other chart types with examples: http://krispo.github.io/angular-nvd3/#/quickstart
*/

(function (app) {
    var service = function () {

        // Defaults
        var subtitle = {
            enable: true,
            text: 'No subtitle'
        },
        altered = [],
        xAxis = { axisLabel: 'X Axis' },
        yAxis = { axisLabel: 'Y Axis' },
        refreshRate = 60,
        format = {};

        var dataFormatters = {
            // todo: adjust the config according to the dataset passed.
            // i.e. when it is a key that can be parsed it should set the tickFormat on the config.

            lineChart: function (config) {
                return function (dataSet) {
                    dataSet = Array.isArray(dataSet) ? dataSet : [];

                    var resultSet = dataSet.map(function (item, index, array) {
                        var newItem = {
                            x: item.key,
                            y: item.value
                        };
                        return newItem;
                    });
                    var lineChartData = {
                        key: config.key || 'series 1',
                        color: config.color, // optional
                        strokeWidth: config.strokeWidth, // optional
                        classed: config.classed, // optional
                        values: resultSet
                    };
                    if (resultSet[0] && moment(resultSet[0].x).isValid()) {
                        config.chart.xTickFormat = function (d) {
                            return d3.time.format('%x')(new Date(d));
                        }
                    }
                    return [lineChartData];
                }
            },
            multiBarHorizontalChart: function (config) {
                return function (dataSet) {
                    dataSet = Array.isArray(dataSet) ? dataSet : [];

                    var multiBarHorizontal = dataSet.map(function (item, index, array) {
                        return {
                            key: item.key,
                            values: [{ value: item.value, label: item.key }]
                        }
                    });

                    if (multiBarHorizontal[0] && moment(multiBarHorizontal[0].key).isValid()) {
                        config.chart.xTickFormat = function (d) {
                            return d3.time.format('%x')(new Date(d));
                        }
                    }

                    return multiBarHorizontal;
                }
            },
            stackedAreaChart: function (config) {
                // should be specific, with appropriate config changes.                
                return dataFormatters.lineChart(config);
            },
            discreteBarChart: function (config) {
                return function (dataSet) {
                    dataSet = Array.isArray(dataSet) ? dataSet : [];

                    var resultSet = dataSet.map(function (item, index, array) {
                        return {
                            label: item.key,
                            value: item.value
                        };
                    });

                    var discrete = {
                        key: config.key || 'series 1',
                        values: resultSet
                    };

                    if (resultSet[0] && moment(resultSet[0].label).isValid()) {
                        config.chart.xTickFormat = function (d) {
                            return d3.time.format('%x')(new Date(d));
                        }
                    }

                    return [discrete];
                }
            },
            historicalBarChart: function (config) {
                return dataFormatters.discreteBarChart(config);
            },
            lineWithFocusChart: function (config) {
                return dataFormatters.lineChart(config);
            },
            sparklinePlus: function (config) {
                // modify config
                return function (dataSet) {
                    dataSet = Array.isArray(dataSet) ? dataSet : [];

                    var resultSet = dataSet.map(function (item, index, array) {
                        return {
                            x: item.key,
                            y: item.value
                        };
                    });
                    if (resultSet[0] && moment(resultSet[0].x).isValid()) {
                        config.chart.xTickFormat = function (d) {
                            return d3.time.format('%x')(new Date(resultSet[d].x));
                        }
                    }
                    return resultSet;
                }


            },
            pieChart: function (config) {//Could be full pie or gauge/pie 
                return function (dataSet) {
                    dataSet = Array.isArray(dataSet) ? dataSet : [];

                    var resultSet = dataSet.map(function (item, index, array) {
                        return {
                            label: item.key,
                            y: item.value
                        };
                    });

                    if (resultSet[0] && moment(resultSet[0].label).isValid()) {
                        config.chart.xTickFormat = function (d) {
                            return d3.time.format('%x')(new Date(d));
                        }
                    }

                    return resultSet;
                }
            }
        };

        function DataArray(dataSet, options) {
            if (!arguments.length) throw new Error('No arguments passed');
            var self = this;
            self.data = dataSet || [];
            self.xFilter = options.dataFilter.xFilter.length && !options.dataFilter.checkAllX ? options.dataFilter.xFilter : self.data.map(function (n) { return n.key; }); // default is every key value
            self.yFilter = options.dataFilter.yFilter ? { min: options.dataFilter.yFilter.min, max: options.dataFilter.yFilter.max || Number.MAX_VALUE }  : { min: 0, max: Number.MAX_VALUE };
            self.sort = options.dataFilter.sort;
            self.filter = function () {
                var filteredData = self.data.filter(filterFnOptions[fnTypeConverter(self.data)]);
                return sortFn(filteredData, self.sort);
            };
            self.orphanXValues = [];
            var sortFn = function (filtered, sort) {
                if (sort === 'ASC')
                    return filtered.sort(function (a, b) { return ((a.key.toLowerCase() + '').localeCompare(b.key.toLowerCase() + '')); });
                else return filtered.sort(function (a, b) { return ((b.key.toLowerCase() + '').localeCompare(a.key.toLowerCase() + '')); });
            }
            var fnTypeConverter = function (data) {
                return "stringFilterFn";

                //ToDo: Account for more data types
                /*var containsText = data.find(function (n) { if (!Number(n.key)) return n; });

                if (containsText) return "stringFilterFn";
                else return "numberFilterFn";*/
            }
            var filterFnOptions = {
                stringFilterFn: function (n) {
                    // (xFilter Condition) && (yFilter Condition)
                    if ((self.xFilter.indexOf(n.key) > -1) && !(n.value >= self.yFilter.min && n.value <= self.yFilter.max)) self.orphanXValues.push(n.key);
                    return (self.xFilter.indexOf(n.key) > -1) && (n.value >= self.yFilter.min && n.value <= self.yFilter.max);
                },
                numberFilterFn: function (n) {
                    //
                    return (n.key >= this.xFilter.min && n.key < this.xFilter.max) && (n.value >= this.yFilter.min && n.value <= this.yFilter.max);
                },
                datetimeFilterFn: function () {
                    //logic if Key equals date
                }
            }

            //ToDo: complete isDate check. tip make use of Date.parse()
            var isDate = function (el) {
                //ToDo: test if date 
            }
        }

        var generateChart = function (options, dataSet) {
            if (!options.type) throw new Error('need to specify a chart type');
            var config;

            var graphData = new DataArray(dataSet, options);

            // todo: get the populatedConfiguration.
            if (options.type == "donutChart") {
                options.type = "pieChart";
                config = getChartConfig(options);
                config.chart.donut = true;
            }
            else {
                config = getChartConfig(options);
            }


            // note: the populatedConfig should be passed to the formatter. 
            var formatter = dataFormatters[options.type](config); // adds or removes properties and functions on the config as necessary for the data passed
            var resultSet = formatter(graphData.filter());

            return { config: config, resultSet: resultSet, orphanXValues: graphData.orphanXValues };
        };
        var getChartConfig = function (options) {
            // todo: fill in population and selection logic

            // note: Within the optons, a angle property should be specified for the pie and doughnut graphs if they are to be gauge graphs.                
            var graphAngle = options.angle || 1;// A division value of 1, 2 or 4 for the graph to be displayed in.
            var charts = [];
            charts.push({
                chart: {
                    type: 'lineChart',
                    x: function (d) { return d.x; },
                    y: function (d) { return d.y; },
                    useInteractiveGuideline: true,
                    xAxis: {
                        axisLabel: 'x - axis',
                    },
                    yAxis: {
                        axisLabel: 'y - axis',
                        tickFormat: function (d) {
                            return d3.format('.02f')(d);
                        }
                    },
                    callback: function (chart) {
                    },
                    noData: 'Failed to load data.'
                }
            });
            charts.push({
                chart: {
                    type: 'multiBarHorizontalChart',
                    x: function (d) { return d.label; },
                    y: function (d) { return d.value; },
                    margin: { bottom: 60 },
                    showControls: false,
                    showValues: false,
                    duration: 500,
                    xAxis: {
                        showMaxMin: false,
                        tickFormat: function (d) {
                            var ans = d.charAt(0).toUpperCase();
                            if (d.length > 3) {

                                return ans + d.substring(1, 3).toLowerCase() + '...';
                            } else {
                                return ans + d.substring(1).toLowerCase();
                            }
                        }
                    },
                    yAxis: {
                        axisLabel: 'Values',
                    },

                    tooltip: {
                        contentGenerator: function (d) {
                            var ans = d.data
                            return '<h3>' + ans.label.charAt(0) + ans.label.substring(1).toLowerCase() + '</h3><h3>' + ans.value + '</h3>';
                        }
                    },
                    noData: 'Failed to load data.'
                }
            });
            charts.push({
                chart: {
                    type: 'stackedAreaChart',
                    x: function (d) { return d.x; },
                    y: function (d) { return d.y; },
                    useVoronoi: false,
                    clipEdge: true,
                    duration: 100,
                    useInteractiveGuideline: true,
                    xAxis: {
                    },
                    yAxis: {
                        tickFormat: function (d) {
                            return d3.format(',.2f')(d);
                        }
                    },
                    zoom: {
                        enabled: true,
                        scaleExtent: [1, 10],
                        useFixedDomain: false,
                        useNiceScale: false,
                        horizontalOff: false,
                        verticalOff: true,
                        unzoomEventType: 'dblclick.zoom'
                    },
                    noData: 'Failed to load data.'
                }
            });
            charts.push({
                chart: {
                    type: 'discreteBarChart',
                    x: function (d) { return d.label; },
                    y: function (d) { return d.value; },
                    margin: { bottom: 60 },
                    showValues: false,
                    xAxis: {
                        axisLabel: 'X Axis',
                        tickFormat: function (d) {
                            var ans = d.charAt(0).toUpperCase();
                            if (d.length > 3) {

                                return ans + d.substring(1, 3).toLowerCase() + '...';
                            } else {
                                return ans + d.substring(1).toLowerCase();
                            }
                        },
                        rotateLabels: 50
                    },
                    yAxis: {
                        axisLabel: 'Y Axis',

                    },
                    tooltip: {
                        contentGenerator: function (d) {
                            var ans = d.data
                            return '<h3>' + ans.label.charAt(0) + ans.label.substring(1).toLowerCase() + '</h3><h3>' + ans.value + '</h3>';
                        }

                    },
                    noData: 'Failed to load data.'
                }
            });
            charts.push({
                chart: {
                    type: 'historicalBarChart',
                    x: function (d) { return d.label; },
                    y: function (d) { return d.value; },
                    showValues: true,
                    valueFormat: function (d) {
                        return d3.format(',.1f')(d);
                    },
                    duration: 100,
                    xAxis: {
                        axisLabel: 'X Axis',
                        rotateLabels: 30,
                        showMaxMin: false
                    },
                    yAxis: {
                        axisLabel: 'Y Axis',
                        axisLabelDistance: -10,
                        tickFormat: function (d) {
                            return d3.format(',.1f')(d);
                        }
                    },
                    tooltip: {
                        keyFormatter: function (d) {
                            return d3.time.format('%x')(new Date(d));
                        }
                    },
                    zoom: {
                        enabled: true,
                        scaleExtent: [1, 10],
                        useFixedDomain: false,
                        useNiceScale: false,
                        horizontalOff: false,
                        verticalOff: true,
                        unzoomEventType: 'dblclick.zoom'
                    },
                    noData: 'Failed to load data.'
                }
            });
            charts.push({
                chart: {
                    type: 'lineWithFocusChart',
                    duration: 500,
                    useInteractiveGuideline: true,
                    xAxis: {
                        //axisLabel: 'X Axis',
                        //tickFormat: function (d) {
                        //    return d3.time.format('%x')(new Date(d))
                        //}
                    },
                    x2Axis: {
                        //tickFormat: function (d) {
                        //    return d3.time.format('%x')(new Date(d))
                        //}
                    },
                    yAxis: {
                        axisLabel: 'Y Axis',
                        tickFormat: function (d) {
                            return d3.format(',.2f')(d);
                        },
                        rotateYLabel: false
                    },
                    y2Axis: {
                        tickFormat: function (d) {
                            return d3.format(',.2f')(d);
                        }
                    },
                    noData: 'Failed to load data.'

                }
            });
            charts.push({
                chart: {
                    type: 'sparklinePlus',
                    x: function (d, i) { return i; },
                    duration: 250,
                    noData: 'Failed to load data.'
                }
            });
            charts.push({
                chart: {
                    type: 'pieChart',
                    x: function (d) { return d.label; },
                    y: function (d) { return d.y; },
                    showLabels: graphAngle == 1 ? true : false,
                    labelThreshold: 0.04,
                    labelSunbeamLayout: graphAngle == 1 ? true : false,
                    duration: 250,
                    pie: {
                        startAngle: function (d) { return d.startAngle / graphAngle - Math.PI / graphAngle },
                        endAngle: function (d) { return d.endAngle / graphAngle - Math.PI / graphAngle }
                    },
                    legend: {
                        margin: {
                            top: 5,
                            right: 70,
                            bottom: 5,
                            left: 0
                        }
                    },
                    noData: 'Failed to load data.'
                }
            });

            return charts.find(function (chart, index, array) {
                return chart.chart.type == options.type;
            });

        }

        return {
            generateChart: generateChart,
            generateConfig: getChartConfig,
            formatters: dataFormatters
        };
    };
    app.service('graphFactoryService', service);
})(angular.module(module_constant));
