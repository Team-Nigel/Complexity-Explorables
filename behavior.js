(function () {
	/** 
	 * Constants representing the positions of graphical elements.
	 * Values are given in pixels.
	 * 
	 * @constant
	 * @type {number}
	 */
	const 
		world_width = 400,
		world_height = 400,
		controlbox_width = 400,
		controlbox_height = 400,
		cartoon_x = 4 * controlbox_width / 5,
		cartoon_y = controlbox_height / 4 + 5,
		button_x = 3 * controlbox_width / 4,
		button_y = 7 * controlbox_height / 8,
		toggle_x = 300,
		toggle_y = 280,
		button_width = 180,
		slider_width = 180;

	/**
	 * Constant representing the margins of the control box.
	 * 
	 * @constant
	 * @type {Object}
	 */
	const controlbox_margin = { top: 10, bottom: 10, left: 15, right: 5 };

	/**
	 * Constants representing fixed simulation-related scalar coefficients.
	 * 
	 * @constant
	 * @type {Number}
	 */ 
	const 
		M = 30; 				// resolution of points around "tadpole" perimeter
		// N = 100, 			    // # of agents
		// L = 128, 			    // world size
		dt = 1,                 // timestep
		noise_speed = 0.25, 	// variation in individuals' speeds
		base_speed = 1.0,       // base speed
		speed_floor = 0.5,      // minimum speed
		speed_ceiling = 1.5,    // maximum speed
		epsilon = 0.2; 	 		// angular increment

	/**
	 * Constants representing default values for sliders that modify simulation parameters.
	 * 
	 * @constant
	 * @type {Number}
	 * @default
	 */
	const
		def_N_agents = 100;   // total number of agents in simulation
		def_world_size = 128; // world size (pixels)
		def_opacity = 1.0;
		def_speed = 0.5,
		def_noise_heading = 0,
		def_R_coll = 1,
		def_R_align = 5,
		def_R_attract = 15,
		def_blindspot = 120,
		def_alpha = 4, // Larger for longer "tail"
		def_size = 20; // "amplitude" for size parameter on tail modifier

	/**
	 * Constants representing slider ranges [lower, upper].
	 *
	 * @constant
	 * @type {Array}
	 * @default
	 */
	const
		n_agents_range = [16, 512],
		world_size_range = [128, 512], 
		speed_range = [0, 1],  
		noise_heading_range = [0, 180], 
		collision_radius_range = [0, 4], 
		alignment_radius_range = [0, 20], 
		attraction_radius_range = [0, 20], 
		blindspot_range = [1, 360], 
		alpha_range = [0.1, 8.0], 
		size_range = [12, 48];

	// rainbow toggle	
	var colorToggle = { id: "t1", name: "Toggle Colors", value: false };

	// parameter objects for the sliders
	var N = {id: "N", name: "# of Agents", range: n_agents_range, value: def_N_agents};
	var L = {id: "L", name: "World Size (pixels)", range: world_size_range, value: def_world_size};	
	var speed = { id: "speed", name: "Speed", range: speed_range, value: def_speed };
	var noise_heading = { id: "noise_heading", name: "Wiggle", range: noise_heading_range, value: def_noise_heading };
	var R_coll = { id: "rcoll", name: "Collision Radius", range: collision_radius_range, value: def_R_coll };
	var R_align = { id: "ralign", name: "Alignment Radius", range: alignment_radius_range, value: def_R_align };
	var R_attract = { id: "rattract", name: "Attraction Radius", range: attraction_radius_range, value: def_R_attract };
	var blindspot = { id: "blindspot", name: "Blind Spot", range: blindspot_range, value: def_blindspot };
	var alpha = { id: "alpha", name: "Relative Tail Length", range: alpha_range, value: def_alpha };
	var agentSize = { id: "agentSize", name: "Agent Size (pixels)", range: size_range, value: def_size };

	// Scales
	const 
		X = d3.scaleLinear().domain([0, L]).range([0, world_width]), 	// Horizontal position
		Y = d3.scaleLinear().domain([0, L]).range([world_height, 0]),   // Vertical position
		C = d3.scaleLinear().domain([0, 90, 180, 270, 360]).range(
				d3.range(5).map(function (d, i) {
					return d3.hsl(30 + (300 * (i-1)/5),1.4,0.5)
				})); // Color values correspond to 4 quadrant orientations

	var agents = initAgentsData(N.value, L.value);

	// this is the box for viewing the moving agents in the animated simulation
	var world = d3.selectAll("#display").append("svg")
		.attr("width", world_width)
		.attr("height", world_height)
		.attr("class", "explorable_display");

	// add agents to the scene
	var agent = world.selectAll(".agent").data(agents).enter().append("g")
		.attr("class", "agent")
		.attr("transform", function (d) { return getAgentTransform(d) });

	// agent: object that is {_groups: Array(1), _parents: Array(1)}
	// For N = 100, then _groups contains 100 elements corresponding to <g> DOM objects
	agent.append("path")
		.attr("class", "drop")
		.attr("d", tadpole())
		.style("fill", function (d) { return getAgentColor(d) })
		.transition().duration(1000).style("opacity", getAgentOpacity());

	// action parameters for the buttons
	var playpause = { id: "b1", name: "", actions: ["play", "pause"], value: 0 };
	var back = { id: "b2", name: "", actions: ["back"], value: 0 };
	var reload = { id: "b3", name: "", actions: ["reload"], value: 0 };

	// widget.block helps distributing widgets in neat arrays
	// sbl: slider block
	var sbl = new widget.block([2, 2, 3, 1, 2], controlbox_height - controlbox_margin.top - controlbox_margin.bottom, 4, "[]");

	// bbl: button block
	var bbl = new widget.block([3], button_width, 0, "()");

	// slider objects
	var handleSize = 12, trackSize = 8, fontSize = 16;

	var sliders = [
		new widget.slider(N).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(resetDisplay),
		new widget.slider(L).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(resetDisplay), 
		new widget.slider(speed).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon),
		new widget.slider(noise_heading).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon),
		new widget.slider(R_coll).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon),
		new widget.slider(R_align).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon),
		new widget.slider(R_attract).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon),
		new widget.slider(blindspot).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon),
		new widget.slider(alpha).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon),
		new widget.slider(agentSize).width(slider_width).trackSize(trackSize).handleSize(handleSize).fontSize(fontSize).update(updateCartoon)
	]

	// button objects (i.e. "play/pause" "back" "pause" "reset")
	var buttons = [
		new widget.button(playpause).update(runpause),
		new widget.button(back).update(resetpositions),
		new widget.button(reload).update(resetparameters)
	]

	// toggle switches
	var toggles = [
		new widget.toggle(colorToggle).update(updateAgentColors).label("top").size(16)
	]

	// helps translate degrees and radian:
	// g2r: degrees to radians
	// r2g: radians to degrees
	var g2r = d3.scaleLinear().domain([0, 360]).range([0, 2 * Math.PI]);
	var r2g = d3.scaleLinear().range([0, 360]).domain([0, 2 * Math.PI]);

	// this is the svg for the widgets

	var controls = d3.selectAll("#controls").append("svg")
		.attr("width", controlbox_width)
		.attr("height", controlbox_height)
		.attr("class", "explorable_widgets")

	// Define central location for each of the controls/cartoon illustrating their influence
	var slider = controls.append("g").attr("id", "sliders")
		.attr("transform", "translate(" + controlbox_margin.left + "," + controlbox_margin.top + ")")

	var cartoon = controls.append("g")
		.attr("transform", "translate(" + cartoon_x + "," + cartoon_y + ")")

	var button = controls.append("g")
		.attr("transform", "translate(" + button_x + "," + button_y + ")")

	var toggle = controls.append("g")
		.attr("transform", "translate(" + toggle_x + "," + toggle_y + ")")

	// sliders, buttons and cartoon elements
	slider.selectAll(".slider").data(sliders).enter().append(widget.sliderElement)
		.attr("transform", function (d, i) { return "translate(0," + sbl.x(i) + ")" });

	button.selectAll(".button").data(buttons).enter().append(widget.buttonElement)
		.attr("transform", function (d, i) { return "translate(" + (bbl.x(i) - button_width / 2) + ",0)" });

	toggle.selectAll(".toggle").data(toggles).enter().append(widget.toggleElement);

	// Add the parts of the cartoon that are described in behavior.css
	cartoon.append("path")
		.attr("d", scope(X(R_attract.value), 270 - blindspot.value / 2))
		.attr("id", "attract_scope")
		.style("opacity", 0)
		.transition().duration(2000).style("opacity", def_opacity);

	cartoon.append("path")
		.attr("d", scope(X(R_align.value), 270 - blindspot.value / 2))
		.attr("id", "orient_scope")
		.style("opacity", 0)
		.transition().duration(2300).style("opacity", def_opacity);

	cartoon.append("path")
		.attr("d", scope(X(20 * speed.value), 90 + noise_heading.value))
		.attr("id", "speed")
		.style("opacity", 0)
		.transition().duration(2600).style("opacity", def_opacity);

	cartoon.append("path")
		.attr("class", "drop")
		.attr("transform", "scale(3)translate(0," + (X(2)) + ")rotate(90)")
		.attr("d", tadpole())
		.attr("id", "droplet")
		.style("fill", "black")
		.style("stroke", "black");

	cartoon.append("circle")
		.attr("r", X(R_coll.value))
		.attr("id", "collision_radius")
		.attr("transform", "scale(3)")
		.style("opacity", 0)
		.transition().duration(3500).style("opacity", def_opacity);

	/////////////////////////////////////////
	// timer variable for the simulation
	var t; // 1000-ms delay delay (corresponds to "fade-ins") 

	// functions for the agents
	function detectCollisions(d,a) {
		// a: reference agent
		// d: this agent (from iteration on array)
		dx = (a.x - d.x);
		dy = (a.y - d.y);
		return (Math.sqrt(dx * dx + dy * dy) < R_coll.value) && (d.id != a.id)
	}

	function getAgentColor(d) {
		return colorToggle.value ? C(d.theta) : "black";
		// return colorToggle.value ? d3.cubehelix(d.theta, 1.4, 0.5) : "black";
		// return colorToggle.value ? d3.interpolateRainbow(d.theta / 360) : "black";
	}

	function getAgentOpacity() {
		return colorToggle.value ? value2opacity(agentSize.value, size_range) : def_opacity;
		// return colorToggle.value ? 0.25 : 1; // for debugging
	}

	function getAgentTransform(d) {
		return "translate(" + X(d.x) + "," + Y(d.y) + ")rotate(" + (-d.theta + 180) + ")"
	}

	function initAgentsData(nAgents, worldSize) {
		return d3.range(nAgents).map(function (d, i) {
			return {
				id: i,
				x: Math.random() * worldSize, 
				y: Math.random() * worldSize,
				theta: Math.random() * 360,
				speed_var: Math.min(Math.max((base_speed + Math.random() * noise_speed), speed_floor), speed_ceiling),
				selected: false
			}
		});
	}

	function resetDisplay() {
		agents = initAgentsData(N.value, L.value);
		agent = agent.data(agents, d => d); // update list

		// agent is from outside local scope
		agent.enter().append("path")
			.attr("class", "drop")
			.attr("d", tadpole())
			.style("fill", function (d) { return getAgentColor(d) })
			.transition().duration(1000).style("opacity", getAgentOpacity());

		agent.exit().remove(); // remove any elements that are not in data list
	}

	function runpause(d) { d.value() == 1 ? t = d3.timer(runsim, 0) : t.stop(); }

	function resetpositions() {

		if (typeof (t) === "object") { t.stop() };

		agents = initAgentsData(N.value, L.value);

		d3.selectAll(".agent").transition().duration(1000).attr("transform", function (d) { return getAgentTransform(d) })
			.call(function () {
				if (typeof (t) === "object" && playpause.value == 1) { t = d3.timer(runsim, 0) }
			})
	}

	function resetparameters() {
		speed.value = def_speed;
		noise_heading.value = def_noise_heading;
		R_coll.value = def_R_coll;
		R_align.value = def_R_align;
		R_attract.value = def_R_attract;
		blindspot.value = def_blindspot;
		alpha.value = def_alpha;
		agentSize.value = def_size;
		d3.selectAll(".slider").select(".handle").transition().attr("cx", function (d) { return d.X(d.value()) })
		updateCartoon();
	}

	function runsim() {
		var wanted_x, // this is the target direction 
			wanted_y; // an agent wants to move to		

		var blind = Math.cos((180 - blindspot.value / 2) / 180 * Math.PI);

		// iterate on full list of agent objects (`agents`)
		agents.forEach(function (a) {
			// agent:           a == this agent (reference agent)
			// these are the agents in the collision radius apart from the reference agent
			var colliders = [];

			// iterate on all other agents
			colliders = agents.filter( function(thisAgent, referenceAgent){return detectCollisions(thisAgent, referenceAgent)})

			// either collisions occur or alignment and attraction occur
			if (colliders.length > 0) {
				wanted_x = a.x - d3.mean(colliders, function (d) { return d.x });
				wanted_y = a.y - d3.mean(colliders, function (d) { return d.y });
			} else {
				// if no collisions occur agents align with agents in their alignment radius
				// and are attracted to the the agents in the attraction radius
				vx = Math.cos(g2r(a.theta));
				vy = Math.sin(g2r(a.theta));
				vabs = Math.sqrt(vx * vx + vy * vy);

				// the interaction set are all agents within the larger attraction radius
				// and outside the blind spot
				interaction_set = agents.filter(function (d) {
					dx = d.x - a.x;
					dy = d.y - a.y;
					d.r = Math.sqrt(dx * dx + dy * dy);
					sight = (dx * vx + dy * vy) / (vabs * d.r);
					return (d.r < R_attract.value) && (sight > blind) && d.id != a.id
				})

				// now we separate them into the agents to align with and those to be attracted to

				var n_orient = interaction_set.filter(function (d) { return d.r < R_align.value })
				var n_attract = interaction_set.filter(function (d) { return d.r > R_align.value })

				var theta_orient = a.theta,
					theta_attract = a.theta;

				var L_orient = n_orient.length;
				var L_attract = n_attract.length;

				if (L_orient > 0) {
					var mx = d3.mean(n_orient, function (x) { return Math.cos(g2r(x.theta)) })
					var my = d3.mean(n_orient, function (x) { return Math.sin(g2r(x.theta)) })
					theta_orient = r2g(Math.atan2(my, mx));
				}

				if (L_attract > 0) {
					var mx = d3.mean(n_attract, function (d) { return d.x });
					var my = d3.mean(n_attract, function (d) { return d.y });
					theta_attract = r2g(Math.atan2(my - a.y, mx - a.x));
				}

				// this is the anticipated direction

				wanted_x = 0.5 * (Math.cos(g2r(theta_orient)) + Math.cos(g2r(theta_attract)))
				wanted_y = 0.5 * (Math.sin(g2r(theta_orient)) + Math.sin(g2r(theta_attract)))
			}

			// this is the update rule, epsilon is the amount of change towards the target direction	

			var new_x = Math.cos(g2r(a.theta)) + epsilon * wanted_x;
			var new_y = Math.sin(g2r(a.theta)) + epsilon * wanted_y;
			a.theta = r2g(Math.atan2(new_y, new_x));
		})

		// Add noise in the heading of each agent to keep it interesting:
		agents.forEach(function (d) {
			d.theta = d.theta + (Math.random() - 0.5) * noise_heading.value;
		})

		// Iterate over each agent:
		agents.forEach(function (d) {
			var v = speed.value;
			var phi = g2r(d.theta);
			var dx = dt * v * d.speed_var * Math.cos(phi);
			var dy = dt * v * d.speed_var * Math.sin(phi);

			var x_new = (d.x + dx);
			var y_new = (d.y + dy);

			// If we hit a boundary, reverse direction (according to boundary dimension):		
			if (x_new < 0 || x_new > L) dx *= -1;
			if (y_new < 0 || y_new > L) dy *= -1;

			d.x = (d.x + dx)
			d.y = (d.y + dy)
			d.theta = r2g(Math.atan2(dy, dx))
		})

		// Update animation of agents in the display:
		agent.data(agents).attr("transform", function (obj) { return getAgentTransform(obj) });
		agent.select("path").style("fill", function (obj) { return getAgentColor(obj) }).style("opacity", getAgentOpacity());

	}
	/////////////////////////////////////////	

	// this is for drawing the scope segments, the circular area of vision
	function scope(r, theta) {
		var x0 = r * Math.cos(theta / 360 * 2 * Math.PI);
		var y0 = -r * Math.sin(theta / 360 * 2 * Math.PI);
		var x1 = -x0;
		var y1 = y0;
		var donkey = theta < 180 ? 0 : 1;
		return "M 0,0 L " + x0 + "," + y0 + " A " + r + " " + r + " 0 " + donkey + " 1 " + x1 + "," + y1 + "L 0,0"
	}

	// this is the shape of the agent as a path	
	function tadpole() {
		var line = d3.line().x(function (d) { return agentSize.value * d.x; }).y(function (d) { return agentSize.value * d.y; });
		var drop = d3.range(M).map(function (d, i) {
			return {
				x: Math.cos(i / M * Math.PI * 2),
				y: 0.5 * Math.sin(i / M * Math.PI * 2) * Math.pow(Math.sin(i / M / 2 * Math.PI * 2), alpha.value)
			};
		})
		return line(drop);
	}

	function tadpole_weighted_center(d) {
		var s = tadpole();

		return {
			x: s.x, 
			y: s.y
		}
	}

	// this updates the agent colors on toggle
	function updateAgentColors() {
		agent.select("path")
			.style("opacity", getAgentOpacity())
			.style("fill-opacity", getAgentOpacity())
			.style("fill", function (d) { return getAgentColor(d) });
	}

	// this updates the cartoon figure
	function updateCartoon() {
		d3.select("#attract_scope").attr("d", scope(X(R_attract.value), 270 - blindspot.value / 2))
		d3.select("#orient_scope").attr("d", scope(X(R_align.value), 270 - blindspot.value / 2))
		d3.select("#collision_radius").attr("r", X(R_coll.value))
		d3.select("#speed").attr("d", scope(X(20 * speed.value), 90 + noise_heading.value))
		d3.select("#droplet").attr("d", tadpole())
		agent.select("path").attr("d", tadpole())
		updateAgentColors();
	}

	function value2opacity(value, domain, range = [0.0, def_opacity]) {
		var x = d3.scaleLinear().domain(domain).range(range);
		return Math.max(0.5,Math.min(1.0,def_opacity - x(value)));
	}

})()