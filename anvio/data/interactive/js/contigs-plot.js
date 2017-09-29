function draw_n_values_plot() {
    return;
    var margin = 10;
    var plot_radius = 300;

    var g = this.svg.append('g')
        .attr('transform', 'translate(400, 400)');

    var angle = d3.scale.linear()
        .domain([0, 99])
        .range([0, 2 * Math.PI]);

    var radius = d3.scale.sqrt()
        .domain([this.stats.n_values[0].length, 0])
        .range([0, plot_radius]);

    var radius_reverse = d3.scale.sqrt()
        .domain([this.stats.n_values[0].length, 0])
        .range([plot_radius, 0]);

    var area = d3.svg.area.radial()
        .angle(function(d, i) { return angle(i); })
        .innerRadius(radius(0))
        .outerRadius(function(d) { return radius(d.length); });

    g.append('path')
        .datum(this.stats.n_values)
        .attr('fill', '#BBB')
        .attr('d', area);

    if (this.settings['show_n50']) {
        var n50arc = d3.svg.arc()
            .innerRadius(radius(this.stats.n_values[49].length))
            .outerRadius(plot_radius);
        
        g.append('path')
            .attr('stroke-width', '0')
            .attr('fill', 'rgb(255, 127, 0)')
            .attr('d', n50arc({ startAngle: angle(0), endAngle: angle(49) }));
    }
    
    if (this.settings['show_n90']) {
        var n90arc = d3.svg.arc()
            .innerRadius(radius(this.stats.n_values[89].length))
            .outerRadius(plot_radius);

        g.append('path')
            .attr('stroke-width', '0')
            .attr('fill', 'rgb(253, 191, 111)')
            .attr('d', n90arc({ startAngle: angle(0), endAngle: angle(89) }));
    }

    g.append('circle')
        .attr('fill', 'none')
        .attr('stroke-width', '3')
        .attr('stroke', '#555')
        .attr('cx', '0')
        .attr('cy', '0')
        .attr('r', plot_radius);

    var tick_values = [];
    for (var i=3; i < 15; i++) {
        var tick_value = Math.pow(10, i);
        var tick_radius = radius(tick_value);
        var previous_tick_radius = (tick_values.length > 0) ? radius(tick_values[tick_values.length-1]) : plot_radius;

        if (tick_radius < plot_radius && tick_radius > plot_radius / 3 && Math.abs(tick_radius - previous_tick_radius) > 10) {
            tick_values.push(tick_value);
        }
    }

    var axis = d3.svg.axis()
        .orient("left")
        .tickValues(tick_values)
        .tickFormat(function(d) {
            g.append('circle')
                .attr('fill', 'none')
                .attr('stroke-width', '1')
                .attr('stroke', '#666')
                .attr('cx', '0')
                .attr('cy', '0')
                .attr('stroke-dasharray', '10, 10')
                .attr('r', radius(d));
            return getReadableSeqSizeString(d, 0);
        })
        .scale(radius_reverse);

    g.append("g")
        .attr('transform', 'translate(0,' + -1 * plot_radius + ')')
        .attr('font-family', 'Helvetica')
        .attr('font-size', '0.8em')
        .attr('fill', '#666')
        .call(axis)
        .selectAll("text")
        .attr("y", -6)
        .attr("x", -3);

    g.append('text')
        .attr('class', 'info')
        .attr('font-family', 'Helvetica')
        .attr('font-size', '1.4em')
        .attr('x', plot_radius * 3/4)
        .attr('y', plot_radius * 3/4);

    var stats = this.stats;
    g.append('circle')
        .attr('fill', '#000000')
        .attr('fill-opacity', '0.0')
        .attr('cx', '0')
        .attr('cy', '0')
        .attr('r', '300')
        .on('mouseenter', function() {
            g.append('path')
                .attr('class', 'hover')
                .attr('fill', '#000000')
                .attr('fill-opacity', '0.1')
                .attr('pointer-events', 'none');

        })
        .on('mousemove', function() {
            var pos = d3.mouse(this);
            var radiant = Math.PI / 2 + Math.atan2(pos[1], pos[0]);
            if (radiant < 0)
                radiant = 2 * Math.PI + radiant;

            var order = Math.floor(radiant / (2 * Math.PI) * 99
                ) + 1;

            var arc = d3.svg.arc()
                .innerRadius(0)
                .outerRadius(plot_radius);

            g.select('.hover')
                .attr('d', arc({ startAngle: angle(order - 1), endAngle: angle(order) }));

            g.selectAll('.info>tspan').remove();

            g.select('.info')
                .append('tspan')
                .attr('font-weight', 'bold')
                .attr('dy', '1.4em')
                .text("N" + order);

            g.select('.info')
                .append('tspan')
                .attr('dy', '1.4em')
                .attr('x', plot_radius * 3/4)
                .text(stats.n_values[order].num_contigs + " contigs ");

            g.select('.info')
                .append('tspan')
                .attr('dy', '1.4em')
                .attr('x', plot_radius * 3/4)
                .text(">= " + getReadableSeqSizeString(stats.n_values[order].length, 1));

        })
        .on('mouseleave', function() {
            g.select('.hover').remove();
            g.select('.info').selectAll('tspan').remove();
        });
};

function draw_gene_counts_chart(container, gene_counts) {
        var svg = d3.select(container)
            .append('svg')
            .attr('viewBox', '0 0 800 300');

        var g = svg.append("g")
            .attr("transform", "translate(0, 60)");

        var plot_width = 780;
        var plot_height = 180;

        var data = [];
        for (key in gene_counts) {
            data.push({'name': key, 'value': gene_counts[key]});
        }
        data.sort(function(a, b) { return (a['value'] < b['value']) - (a['value'] > b['value'])});

        var xscale = d3.scale.ordinal().rangeBands([120, plot_width]);
        var yscale = d3.scale.linear().rangeRound([plot_height, 0]);
        var color_scale = d3.scale.linear().range(['#fff7bc', '#d95f0e']);

        xscale.domain(data.map(function(d) { return d.name; }));
        yscale.domain([0, d3.max(data, function(d) { return d.value; })]);
        color_scale.domain([0, d3.max(data, function(d) { return d.value; })]);

        var bar_group = g.selectAll(".bar")
                            .data(data)
                            .enter()
                            .append("g")
                            .on('mouseenter', function(d) {
                                d3.select(this)
                                    .select('rect')
                                    .attr('fill-opacity', '0.5');

                                var tooltip_pos = {
                                    'x': Math.max(Math.min(xscale(d.name) - 80,  620), 120),
                                    'y': yscale(d.value) - 50,
                                    'width': 160,
                                    'height': 40
                                };

                                var tooltip = d3.select(this)
                                    .append('g')
                                        .attr('class', 'plot-tooltip')
                                        .attr('transform', 'translate(' + tooltip_pos.x + ',' + tooltip_pos.y + ')');

                                tooltip.append('rect')
                                        .attr('rx', '8')
                                        .attr('ry', '8')
                                        .attr('height', tooltip_pos.height)
                                        .attr('fill-opacity', '0.7')
                                        .attr('width', tooltip_pos.width);
                                       
                                var tooltip_text = tooltip.append('text')
                                                    .attr('x', '10')
                                                    .attr('y', '15')
                                                    .attr('fill', '#FFFFFF')
                                                    .attr('font-family', 'Helvetica')
                                                    .attr('font-size', '12px');

                                tooltip_text.append('tspan')
                                                .text('Gene: ' + d.name);

                                tooltip_text.append('tspan')
                                                .text('Count: ' + d.value)
                                                .attr('x', '10')
                                                .attr('dy', '1.4em');

                            })
                            .on('mouseleave', function(d) {
                                d3.select(this)
                                    .select('rect')
                                    .attr('fill-opacity', '1');

                                d3.select(this)
                                    .select('.plot-tooltip').remove();
                            });

    bar_group.append('rect')
            .attr("class", "bar")
            .attr("x", function(d) { return xscale(d.name); })
            .attr("y", function(d) { return yscale(d.value); })
            .attr("width", xscale.rangeBand())
            .attr("fill", function(d) { return color_scale(d.value); })
            .attr("height", function(d) { return plot_height - yscale(d.value); });

    var yAxis = d3.svg.axis()
        .scale(yscale)
        .orient("left")
        .tickFormat(d3.format("d"))
        .tickSubdivide(0);

    g.append("g")
        .attr("class", "x_axis")
        .attr("transform", 'translate(118,0)')
        .call(yAxis);

    var bins = d3.layout.histogram()
        .bins(data[0].value)
        (data.map(function(x) { return x.value }));

    var bins_y = d3.scale.linear()
        .domain(d3.extent(bins, function(d){return d.length }))
        .range([0, 70]);

    var histogram = g.append('g').attr('class', 'histogram');

    histogram.selectAll('rect')
            .data(bins)
            .enter()
            .append('rect')
            .attr("class", "histogram-bar")
            .attr("y", function(d) { return yscale(d.x); })
            .attr("height", function(d) { return 1; })
            .attr("x", function(d) { return 80 - bins_y(d.y); })
            .attr("width", function(d) { return bins_y(d.y); } )
            .attr("fill", '#d95f0e');
};

function draw_contig_lengths_chart(container, data) {
        var svg = d3.select(container)
            .append('svg')
            .attr('viewBox', '0 0 800 300');

        var g = svg.append("g")
            .attr("transform", "translate(0, 60)");

        var plot_width = 780;
        var plot_height = 180;

        var xscale = d3.scale.ordinal().rangeBands([120, plot_width]);
        var yscale = d3.scale.linear().rangeRound([plot_height, 0]);
        var color_scale = d3.scale.linear().range(['#fff7bc', '#d95f0e']);

        xscale.domain(data.map(function(d, i) { return i; }));
        yscale.domain([0, d3.max(data)]);
        color_scale.domain([0, d3.max(data)]);

        var bar_group = g.selectAll(".bar")
                            .data(data)
                            .enter()
                            .append("g")
                            .on('mouseenter', function(d, i) {
                                d3.select(this)
                                    .select('rect')
                                    .attr('fill-opacity', '0.5');

                                var tooltip_pos = {
                                    'x': Math.max(Math.min(xscale(i) - 80,  620), 120),
                                    'y': yscale(d) - 50,
                                    'width': 160,
                                    'height': 40
                                };

                                var tooltip = d3.select(this)
                                    .append('g')
                                        .attr('class', 'plot-tooltip')
                                        .attr('transform', 'translate(' + tooltip_pos.x + ',' + tooltip_pos.y + ')');

                                tooltip.append('rect')
                                        .attr('rx', '8')
                                        .attr('ry', '8')
                                        .attr('height', tooltip_pos.height)
                                        .attr('fill-opacity', '0.7')
                                        .attr('width', tooltip_pos.width);
                                       
                                var tooltip_text = tooltip.append('text')
                                                    .attr('x', '10')
                                                    .attr('y', '15')
                                                    .attr('fill', '#FFFFFF')
                                                    .attr('font-family', 'Helvetica')
                                                    .attr('font-size', '12px');

                                tooltip_text.append('tspan')
                                                .text('Length: ' + getReadableSeqSizeString(d));
                            })
                            .on('mouseleave', function(d) {
                                d3.select(this)
                                    .select('rect')
                                    .attr('fill-opacity', '1');

                                d3.select(this)
                                    .select('.plot-tooltip').remove();
                            });

    bar_group.append('rect')
            .attr("class", "bar")
            .attr("x", function(d, i) { return xscale(i); })
            .attr("y", function(d) { return yscale(d); })
            .attr("width", xscale.rangeBand())
            .attr("fill", function(d) { return color_scale(d); })
            .attr("height", function(d) { return plot_height - yscale(d); });

    var yAxis = d3.svg.axis()
        .scale(yscale)
        .orient("left")
        .tickFormat(function(d) { return getReadableSeqSizeString(d); })
        .tickSubdivide(0);

    g.append("g")
        .attr("class", "x_axis")
        .attr("transform", 'translate(118,0)')
        .call(yAxis);
};
