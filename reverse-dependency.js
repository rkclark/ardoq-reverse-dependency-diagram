{
	noExport: true,
	/* Called once during initialization of the plugin */
	init: function() {
		var that = this;
		/* Add our custom css declarations that we need, the true parameter tells the plugin to overwrite the style */
		this.addCSS(".lane.well", "padding:5px;", true);
		this.addCSS(".lane .name", "padding:5px;color:#fff;display:block;margin-left:-2px;font-weight:bolder;clear:both;", true);
		this.addCSS(".lane, .group", "border-color:#333; box-shadow: 2px 3px 3px #444;");
		this.addCSS(".lane.workspace > .group", "width:100%;");
		this.addCSS(".group", "min-width:100px; margin:5px; vertical-align:top; border:solid 1px #555;display:inline-block;clear:none;padding:5px;", true);
		this.addCSS(".group .groupName", "display:block;width:100%; text-align:center; color:#fff");
		this.addCSS(".ref", "min-width:50px; margin:5px; border:dashed 1px #eee;display:inline-block;clear:none;padding:5px;background-color:#777;vertical-align:top;text-align:center;", true);
		this.addCSS(".ref.child", "clear:both;float:left");
		this.addCSS(".refName", "color:#fff; float:left", true);
		this.addCSS(".lane.workspace", "background-color: purple");
		this.addCSS(".lane.level1", "background-color: #446ab2");
		this.addCSS(".group.level1", "background-color: #446ab2");
		this.addCSS(".group.level2", "background-color: #40a949");
		this.addCSS(".group.level3", "background-color: #a91111");
		this.addCSS(".group.level4", "background-color: #aa3fbb");
		this.addCSS(".group.level5", "background-color: #ffb300");
		this.addCSS(".lanes .lane .group.active, .lanes .lane .ref.active", "background-color: orange !important; box-shadow: 5px 5px 5px #444;");
		this.addCSS(".lanes .svgIcon", "color:#fff; margin-right:8px;");
		this.addMenu({
			name: "Color by reference",
			id: "useTopParent",
			icon: "fa fa-external-link",
			click: function() {
				if ($(this).toggleClass('active').hasClass('active')) {
					$(this).parent().addClass("active");
					that.colorByReference = true;
				} else {
					$(this).parent().removeClass("active");
					that.colorByReference = false;
				}
				that.localRender();
			}
		});
		this.addMenu({
			name: "Include reference parents",
			id: "includeRefParent",
			icon: "fa fa-cube",
			click: function() {
				if ($(this).toggleClass('active').hasClass('active')) {
					$(this).parent().addClass("active");
					that.includeRefParent = true;
				} else {
					$(this).parent().removeClass("active");
					that.includeRefParent = false;
				}
				that.localRender();
			}
		});
	},

	addGroup: function(comp, lane) {
		var that = this;
		var hasChild = false;
		_.each(comp.children, function(c) {
			hasChild = true;
			var icon = c.unicodeIcon || '';
			var group = $("<div class='group well' ><span class='noSmartLink component groupName'><span class='svgIcon'>" + icon + "</span> " + c.name + "</span></div>");

			group.on("mouseenter", function() {
				$(".active", that.getContainerElement()).removeClass("active");
				var ids = c.comp.cid;
				var elems = $("." + ids, that.getContainerElement());

				//No need to highlight if it's the only element with the id.
				if (elems.length > 1) {
					elems.addClass("active");
				}

			}).on("mouseleave", function() {
				var ids = c.comp.cid;
				$("." + ids, that.getContainerElement()).removeClass("active");
			});

			$("span", group).get(0).comp = c.comp;

			group.addClass(c.comp.getCSS() + " background");
			that.addGroup(c, group);
			if (comp.children && comp.children.length > 0) {
				group.addClass("children");
			}
			if (that.colorByReference) {
				group.css('cssText', 'background-color: white !important');
				$(group).find('span.component').css('cssText', 'color:black');
				$(group).find('span.component .svgIcon').css('cssText', 'color:black');
			}

			group.appendTo(lane);
			that.addReference(c, group);
			var minHeight = 10;
			var resizeContainer = lane.hasClass("workspace") ? group : lane;
			resizeContainer.children(".group, .ref").each(function() {
				var h = $(this).outerHeight();
				if (h < 150 && h > minHeight) {
					minHeight = h;
				}
			}).css("min-height", minHeight);
		});
		return hasChild;
	},
	addReference: function(comp, group) {
		var that = this;

		//Changed this to get target refs rather than source refs by component - rkclark
		var references = this.getReferences().getTargetRefsByComponent(comp.comp);
		console.log(references);
		var foundRef = references && references.length > 0;
		_.each(references, function(r) {
			//Changed this to get the reference source rather than reference target - rkclark
			var targetComp = r.getSource();
			if (targetComp) {
				var ref = that.createRefNode(targetComp, r, 0);
				group.append(ref);
			}
		});
		return foundRef;
	},
	createRefNode: function(comp, r, depth) {
		var that = this;
		var icon = comp.getCharIcon() || '';
		var ref = $("<div class='ref well'><span class='integration reference refName'><span class='svgIcon'>" +
			icon + "</span> " + comp.name() + "</span></div>");
		ref.addClass(comp.getCSS() + " integration");



		if (depth == 0) {
			if (that.colorByReference) {
				ref.css('background-color', r.getLineType().color);
			} else {
				ref.addClass('background');
			}

			ref.on("mouseover", function() {
				var ids = comp.cid;
				$(".active", that.getContainerElement()).removeClass("active");
				$("." + ids, that.getContainerElement()).addClass("active");

			}).on("mouseout", function() {
				var ids = comp.cid;
				$("." + ids, that.getContainerElement()).removeClass("active");
			});
		}

		$("span", ref).click(function(e) {
			e.stopImmediatePropagation();
			e.stopPropagation();
			that.getContext().setComponent(comp);
			return false;
		}).get(0).integration = r;

		var parent = comp.getParent();
		if (parent && that.includeRefParent) {
			ref.addClass("child");
			var childRef = ref;
			ref = this.createRefNode(parent, r, depth + 1);
			ref.append(childRef);
		}


		return ref;

	},
	/* Called automatically every time a page, reference, context, or filter is changed. */
	localRender: function() {

		/*Get all our Workspaces and Pages as a tree and respect filters.
		   - nodeMap = represents a flat map of all the nodes
		   - root = returns the root node (workspace node) or a top level
		        "Workspaces"-node if several workspaces are open simoultanously
		*/
		var that = this;
		var workspace = this.getContext().workspace();
		if (!workspace) {
			return;
		}

		var model = workspace.getModel();
		var result = this.getD3ComponentHierarchy(true);

		var container = this.getContainerElement();
		container.empty();

		var lanes = $("<div class='lanes'></div>");
		container.append(lanes);
		var laneMap = {};
		var laneContainer = {};
		_.each(result.root.children, function(c) {
			var lane = laneMap[c.key];
			if (!lane) {
				var icon = c.unicodeIcon || '';
				lane = $("<div class='lane well'><span class='name component noSmartLink'><span class='svgIcon'>" + icon + "</span> " + c.name + "</span></div>");
				$("span", lane).get(0).comp = c.comp;
				lane.addClass(c.comp.getCSS() + " background");
				laneMap[c.key] = lane;
			}
			lane.appendTo(lanes);
			var hasContent = that.addGroup(c, lane);
			hasContent = that.addReference(c, lane) || hasContent;
			if (!hasContent) {
				lane.empty().remove();
			}

		});

	}
}
