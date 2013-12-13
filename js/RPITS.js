(function() {
	RPITS = {};

	RPITS.ui = {};

	RPITS.constants = {
		KEYCODE: {
			SPACEBAR: 32,
			LETTER_C: 67,
			ENTER: 13,
			LETTER_R: 82,
			LETTER_E: 69,
			ARROW_DOWN: 40,
			ARROW_UP: 38,
			TAB: 9		
		}
	};

	RPITS.ui.Monitor = function(options) {
		this.options = options;
		this.el = $('<div id="' + options.id +'"></div>');
		this.label = $('<div class="label">'+options.name+'</div>');
		this.image = $('<div class="image"></div>');
		this.el.append(this.label);
		this.el.append(this.image);
		$('body').append(this.el);
		this.title = null;

		this.on = function(title) {
			if(!(title instanceof RPITS.ui.Title)) {
				title = title.data('title');
			}
			$('#pane li').removeClass('selected on-'+this.options.id + ' ' + this.options.remove);
			title.listEl.addClass('selected on-'+this.options.id);
			this.title = title;
			this.el.addClass('on');
			this.label.text(this.options.name + ' - ' + title.getDisplayName());
			var image = $('<img src="out/'+title.getFilename() + '?rand=' + Date.now() +'">');
			image.width(this.el.css('width'));
			this.image.html(image);
		};
		this.active = function() {
			return this.title;
		};
		this.off = function() {
			this.title.listEl.removeClass('on-'+this.options.id);
			this.title = null;
			this.el.removeClass('on');
			this.label.text(this.options.name);
			this.image.empty();
		};
	};

	RPITS.ui.Console = function() {
		this.el = $('<div id="log"></div>');
		$('body').append(this.el);

		this.log = function(string) {
			console.log(string);
			this.el.append(string);
			this.el.animate({
				scrollTop: this.el.prop("scrollHeight") - this.el.height()
			}, 200);
		};
	};

	RPITS.ui.ListTabs = function(eventId,options) {
		this.lists = {};
		this.eventCallback = function(eventData) {
			this.eventData = eventData;
			this.urls = [
				'im_title_list.php?event='+eventId+'&format=json',
				'im_title_list.php?team='+eventData.team1+'&format=json',
				'im_title_list.php?team='+eventData.team2+'&format=json'
			];

			if(options.billboards == true) {
				this.urls.push('im_title_list.php?thing=billboards');
			}
			var promises = $.map(this.urls,function(url) {
				return $.ajax(url);
			});;

			$.when.apply($,promises).done(this.loadLists);
		}.bind(this);
		getSingleRow(options.dbName,'events',"`id` = '"+eventId+"'",this.eventCallback);

		this.loadLists = function() {
			var listNames = [
				this.eventData.name + ' Titles',
				this.eventData.team1 + ' Players',
				this.eventData.team2 + ' Players',
				'Billboards'
			];
			var listKeys = ['titles','team1','team2','billboards'];
			for(var key in arguments) {
				this.lists[listKeys[key]] = new RPITS.ui.List(listNames[key],listKeys[key],this.urls[key],JSON.parse(arguments[key][0]));
			}
			this.renderTabs();
			this.renderLists();
			$(window).trigger('resize');
		}.bind(this);
	};

	RPITS.ui.ListTabs.prototype.renderTabs = function() {
		var tabs = $('<div id="tabstrip">');
		tabs.append('<span id = "help" style = "font-size:11px"> Up/Down - Select; Left/Right - Tab; E - Edit; R - Preview; Q - Queue; Space - Bring Up/Down; F - Force Render; U - Update All; C - Cut</span>');
		for(var key in this.lists) {
			tabs.append(this.lists[key].renderTab());
		}
		tabs.append('<button id="updateAll">Update All</button><input id="updateAllForce" type="checkbox" value="true" />');
		tabs.children('.tab').first().addClass('active');
		tabs.attr('style',$('#tabstrip').attr('style'));
		$('#tabstrip').replaceWith(tabs);
	};

	RPITS.ui.ListTabs.prototype.renderLists = function() {
		this.pane = $('<div id="pane"></div>');
		for(var key in this.lists) {
			this.pane.append(this.lists[key].renderList());
		}
		this.pane.children('.titles').first().addClass('active').children('li').first().addClass('selected');
		$('#pane').replaceWith(this.pane);
	};

	RPITS.ui.ListTabs.prototype.switchLists = function(el) {
		$('#tabstrip .tab').removeClass('active');
		el.addClass('active');
		$('.titles').removeClass("active");
		$('.titles').hide();
		var listId = $('.tab.active').data('tabIdentifier');
		$('.titles[data-list-identifier='+listId+']').show().addClass('active');
		$("li").removeClass("selected");
		$(".titles.active li:first").addClass("selected");
		$(".selected").scrollintoview({duration: 0});
	};

	RPITS.ui.List = function(name,identifier,url,titles) {
		this.titles = [];
		for(var key in titles) {
			this.titles.push(new RPITS.ui.Title(titles[key]));
		}
		this.url = url;
		this.name = name;
		this.identifier = identifier;
		return this;
	};

	RPITS.ui.List.prototype.renderTab = function() {
		this.tab = $('<div class="tab" data-tab-identifier="'+this.identifier+'">'+this.name+'</div>').data('list',this);
		return this.tab;
	};

	RPITS.ui.List.prototype.renderList = function() {
		this.listEl = $('<ul class="titles" data-list-identifier="'+this.identifier+'"></ul>').data('list',this);
		for(var key in this.titles){
			this.listEl.append(this.titles[key].renderListEl());
		}
		return this.listEl;
	};

	RPITS.ui.List.prototype.getTitleById = function(id) {
		for(var key in this.titles) {
			if(this.titles[key].id == id) {
				return this.titles[key];
			}
		}
	}

	RPITS.Keyer = function(options) {
		var DURATION_IN = 15;
		var DURATION_OUT = 15;
		options = options || {};
		this.base = options.base || 'putter.php';
		this.el = $('<div id="loadTarget"></div>');

		this.doXHR = function(url,callback) {
			$.get(url,function(data) {
				console.log(data);
				if(typeof callback === 'function') {
					callback(data);
				}
			});
		};

		this.command = function(command,callback) {
			this.doXHR(this.base + '?command=' + command,callback);
		};

		this.put = function(title,callback) {
			this.doXHR(this.base + '?path=out/' + title.getFilename(),callback);
		};

		this.offProgram = function(duration) {
			this.title = null;
			duration = duration || (this.title && this.title.durationOut) || DURATION_OUT;
			this.command('dissolve_out/' + duration);
		}

		this.onProgram = function(title,duration) {
			// convert jquery obj to title
			if(!(title instanceof RPITS.ui.Title)) {
				title = title.data('title');
			}
			this.title = title;
			duration = duration || title.durationIn || DURATION_IN;
			this.put(title,function() {
				this.command('dissolve_in/' + duration);
			}.bind(this));
		};
	};
	window.RPITS = RPITS;
}(window));