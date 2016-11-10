/*
Credit card statement analysis application written for Intuit RIT recruiting challenge.
Uses javascript to analyze data read off of credit card statements and recommends courses of action
to the user to save money.
Date: 2/7/16
Author: Eric R Dudley
Title: Sage
*/

"use strict";

var chart = 0;
Number.prototype.formatMoney = function(c, d, t){ //3rd party code by Patrick Desjardins
var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "." : d, 
    t = t == undefined ? "," : t, 
    s = n < 0 ? "-" : "", 
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 };

if (!Array.prototype.indexOf) { //3rd party code by ErikE
   Array.prototype.indexOf = function(item) {
      var i = this.length;
      while (i--) {
         if (this[i] === item) return i;
      }
      return -1;
   }
}

function go_to_top()
{
	$('html,body').animate({scrollTop: 0},'slow');
}
$(window).on('beforeunload', function() { //Move viewport back to top of page on close to prevent the browser from remembering where it last was.
	$("#page_cover").css("display","inline");
    $(window).scrollTop(0);
});

function start_over() //Cleaner to just reload page rather than reset everything.
{
	location.reload(true);
}

function toggle_more(elem) //Event function that is called when Show More or Show Less buttons are pressed.
{
	var secs = ["monthly","weekly","rare"];
	for(var i=0; i<secs.length; i++)
	{
		if($(elem).hasClass(secs[i]+"_toggle"))
		{
			if( $(elem).hasClass("less_t") )
			{
				$(elem).removeClass("less_t");
				$("."+secs[i]+"_costs").removeClass("less");
				$(elem).html("Show Less");
			}
			else
			{
				$(elem).addClass("less_t");
				$("."+secs[i]+"_costs").addClass("less");	
				$(elem).html("Show More");
			}
		}	
	}
	$(window).scroll();
}
var file_text = "Default";
var infile = false;

function check_changed() //Event called when include rent checkbox is clicked.
{
	animatePie();
}
function readInFile(event) //Does not actually parse the file, this just triggers the animation and waits for user to click on Analyze button.
{
	var file = event.target.files[0];
	var $filename_h2 = $("#file_choose_wrapper .filename");
	if(file){
		var filename =  "";
		if(file.name.length <= 20)
		{
			filename = file.name;
		}
		else
		{
			filename = file.name.substring(0,9)+"..."+file.name.substring(file.name.length-8);
		}
		$filename_h2.html(filename);
		$filename_h2.css("right",170-($filename_h2.width()/2)+"px");
		$filename_h2.css("top",145-($filename_h2.height()/2)+"px");
		$filename_h2.css("opacity","1");
		$("#file_choose_wrapper .circle").css("background-color","#E6E8FA");
		$("#file_choose_wrapper .circle").css("width","300px");
		$("#file_choose_wrapper .circle").css("height","300px");
		$("#file_choose_wrapper .circle").css("opacity","1");
		$("#file_choose_wrapper .bar").css("background-color","#CFB53B");
		setTimeout(function(){
			$("#file_choose_wrapper .bar").css("left","0%");
			$("#file_choose_wrapper .bar").css("right","0%");
		},300);
		$(".start_here").css("opacity","0");
		setTimeout(function(){$(".start_button").css("opacity","1");},1000); //Don't show analyze button right away so they check they picked the right file before they start.
		infile = file;
	}
}


$(document).ready(function(){
	$("body").scrollTop(0);
	CanvasJS.addColorSet("metal", ["#E6E8FA","#CFB53B","#C6C8DA"]);
	document.getElementById('file_input').addEventListener('change', readInFile, false);
});

$(window).scroll(function(){
	var $bars = $(".divider");
	for(var i=0; i<$bars.length; i++)
	{
		if($($bars[i]).visible()) //Checks if a divider is on the screen and expands it if it is.
		{
			$($bars[i]).css("width","100%");
		}
	}
	if($(window).scrollTop() < 60) //Aligns start over button to the farthest left it can go.
	{
		$("#start_over").css("left","180px");
	}
	else
	{
		$("#start_over").css("left","65px");
	}
});

function hide_layover()
{
	$("#file_choose_wrapper").css("opacity","0");
	setTimeout(function(){$("#file_choose_wrapper").css("display","none");},1000);
	$("#page_cover").css("display","none");
	$("body").css("overflow","visible");
	$("#start_over").css("display","inline");
}

function update_time_saved() //Event when the input range is changed.
{
	var total_months = $("#time_saving").val();
	var years = (total_months-(total_months%12))/12;
	var months = total_months%12;
	var str = "";
	if( years > 0 )
	{
		if( years == 1 )
		{
			str += years+" year ";
		}
		else
		{
			str += years+" years ";
		}
	}
	if( months > 0)
	{
		if( months == 1 )
		{
			str += months+" month";
		}
		else
		{
			str += months+" months";
		}
	}
	$("#time_saving_label").html(str);
	$(".total_savings").html("+$"+(monthly_savings*total_months).formatMoney(2));
}
var Purchase = function(cost,year,month,day,desc,real_desc){ //Class that represents an individual purchase.
	this.cost = cost;
	this.date = new Date(year,month,day);
	this.desc = desc;
	this.real_desc = real_desc; //Unedited description, not quite implemented.
};

var PoP = function(first) //Class that represents a place of purchase, can contain multiple purchases from the same place.
{
	this.purchases = [];
	this.desc = first.desc;
	this.real_desc = [];
	this.mean_cost = 0;
	this.total_cost = 0;
	this.pw_cost = 0;
	this.mean_freq = 0;
	this.freqs = [];
	this.freq_desc = "";
	var savings = 0;
	this.addPurchase = function(purchase)
	{
		this.purchases.push(purchase);
		this.real_desc.push(purchase.real_desc);
	}
	this.eval = function() //Parses through all purchases and calculates analysis data.
	{
		for(var i=0; i<this.purchases.length; i++)
		{
			this.total_cost += this.purchases[i].cost;
			if(i > 0 && this.purchases.length > 1)
			{
				this.freqs.push(Math.abs(this.purchases[i].date-this.purchases[i-1].date)/86400000);
			}
		}
		this.mean_cost = this.total_cost/this.purchases.length;
		var tot_freq = 0;
		for(var i=0; i<this.freqs.length; i++)
		{
			tot_freq += this.freqs[i];
		}
		this.mean_freq = tot_freq/this.freqs.length;
		this.mean_freq = Math.round(this.mean_freq);
		this.pw_cost = this.total_cost/(total_time/7);
		this.savings = this.pw_cost*4.2;
	}
	this.desc = first.desc;
	this.addPurchase(first);
}

var Rec = function(title, desc, savings) //Class that represents a recommendation, easier to handle when rendering.
{
	this.title = title;
	this.desc = desc;
	this.savings = savings;
}

// Global scope vars.
var pops = [];
var monthly = [];
var weekly = [];
var rarely = [];
var start_date = 0;
var end_date = 0;
var total_time = 0;
var recs = [];
var monthly_savings = 0;

function analyze() //Event called when user clicks on analyze button. 
{
	hide_layover(); //Hide the file selection layover.
	processFile(); //Process the file and render the output.
	//console.log(file_text.length);	<--Discovered that the file reading function is asynchronous, which is fine.
	$(window).scroll(); //Simulate scroll to expand first divider.
	//console.log("Starting analysis."); <--For debugging.
}

function processFile() //Asychronously reads in the file, parses through it, and outputs results.
{
	if (infile) {
		var r = new FileReader();
		r.onload = function(e) { 
			buildObjects(r.result); //Make a bunch of Purchase and PoP objects and throw them into one long list.
			evalObjects(); //Run eval method for each Pop and organize them into monthly/weekly/rare.
			renderObjects(); //Generate html tags and insert them into the document.
		};
		r.readAsText(infile); //Starts process.
	}
}

function buildObjects(str)
{
	var lines = str.split("\n");
	var line = "";
	for(var i=0; i<lines.length; i++)
	{
		line = lines[i].split(",");
		var date = line[0].split("-");
		var year = Number(date[0]);
		var month = Number(date[1]);
		var day = Number(date[2]);
		var real_desc = desc;
		var desc = processDesc(line[1]);
		var cost = Math.round(100*Number(line[2]))/100; //Round to 2 decimal places
		var pur = new Purchase(cost,year,month,day,desc,real_desc);
		var exists = false;
		for(var j=0; j<pops.length; j++)
		{
			if(pops[j].desc == desc) //Add to existing PoP if already exists...
			{
				exists = true;
				pops[j].addPurchase(pur);
			}
		}
		if(!exists) //...otherwise make a new PoP.
		{
			pops.push(
				new PoP(pur)
			);
		}
		if( i==0)
		{
			start_date = new Date(year,month,day);
		}
		else if(i==lines.length-1)
		{
			end_date = new Date(year,month,day);
			total_time = Math.round(Math.abs(end_date-start_date)/86400000); //Have to divide by 86400000 because subtracting Date objects returns millisecond int.
		}
	}
}

function evalObjects() //Evaluate each PoP and put it in its place, also generates recommendations.
{
	for(var i=0; i<pops.length; i++)
	{
		pops[i].eval();
		if(pops[i].mean_freq < 15)
		{
			pops[i].freq_desc = "weekly";
			weekly.push(pops[i]);
		}
		else if(pops[i].mean_freq < 40)
		{
			pops[i].freq_desc = "monthly";
			monthly.push(pops[i]);
		}
		else
		{
			pops[i].freq_desc = "rarely";
			rarely.push(pops[i]);
		}
	}
	var title = "";
	var desc = "";
	var savings = 0;
	var streaming = [];
	var restaurant_names = ["Brugge Brasserie","Mama Carolla's Old Italian","Yats","Recess","Twenty Tap","Goose the Market","Siam Square","Bluebeard","Bazbeaux","The Tamale Place","Mug N' Bun","Shoefly Public House","Sahm's Place","Delicia","Sisters"];
	var restaurants = [];
	for(var i=0; i<pops.length; i++)
	{
		//Gas
		if(pops[i].desc == "Gas")
		{
			title = "Gas";
			desc = 'You spend <span class="red">$'+pops[i].pw_cost.formatMoney(2)+"</span> a week on gas. Instead of driving to work or restaurants, try to bike or walk at least two times a week. This will save the environment and your wallet.";
			savings = pops[i].savings*(1/3);
		}
		else if(pops[i].desc == "Rent" && pops[i].mean_cost > 1024)
		{
			title = "Rent";
			desc = 'You spend <span class="red">$'+pops[i].mean_cost.formatMoney(2)+'</span> a month on rent. The average monthly rent in America is about $1024.00. Try using an apartment finding service like <a href="http://www.forrent.com/">ForRent</a> to find a cheaper apartment.';
			savings = (pops[i].savings-1024);
		}
		else if(pops[i].desc == "Uber")
		{
			title = "Uber";
			desc = 'You spend <span class="red">$'+pops[i].savings.formatMoney(2)+'</span> a month on Uber. While Uber is often handy, it is one of the most expensive forms of transportation. Biking, riding the bus, the subway, or even driving instead of calling an Uber will save you money.';
			savings = (pops[i].savings*0.6);
		}
		else if(pops[i].desc == "Netflix" || pops[i].desc == "Hulu" || pops[i].desc == "Spotify")
		{
			streaming.push(pops[i]);
		}
		else if(restaurant_names.indexOf(pops[i].desc) != -1 || /restaurant|cafe|steak|brewhouse|pizz|delicatessen|creamery/gi.test(pops[i].desc))
		{
			restaurants.push(pops[i]);
		}
		if(title != "")
		{
			recs.push(new Rec(title,desc,savings));
			monthly_savings += savings;
			title = "";
			desc = "";
			savings = 0;
		}
	}
	if(streaming.length > 0)
	{
		var streaming_cost = 0;
		var streaming_savings = 0;
		for(var i=0; i<streaming.length; i++){streaming_cost += streaming[i].mean_cost; streaming_savings += streaming[i].savings;}
		title = "Streaming Services";
		desc = 'You spend <span class="red">$'+streaming_cost.formatMoney(2)+"</span> a month on streaming services such as "+streaming[0].desc+". Try reading books or starting a new hobby and drop these services to save money.";
		savings = streaming_savings;
		monthly_savings += savings;
		recs.push(new Rec(title,desc,savings));
	}
	if(restaurants.length > 0)
	{
		var restaurants_cost = 0;
		var restaurants_savings = 0;
		for(var i=0; i<restaurants.length; i++){restaurants_cost += restaurants[i].savings; restaurants_savings += restaurants[i].savings;}
		title = "Restaurants";
		desc = 'You spend <span class="red">$'+restaurants_cost.formatMoney(2)+"</span> a month at restaurants such as "+restaurants[0].desc+'. Try going to markets such as <a target="_blank" href="http://www.wegmans.com/">Wegmans</a>, <a target="_blank" href="https://www.aldi.us/">Aldi</a>, or local stores to buy ingredients and make food at home. Do this about half of the time you would have gone out to eat.';
		savings = restaurants_savings*0.5;
		monthly_savings += savings;
		recs.push(new Rec(title,desc,savings));
	}
	if(monthly.length > 5)
	{
		title="Monthly Costs";
		desc="You have quite a few costs that recur every month. While some of these costs might be necessary, it is always possible to shave off some of the luxuries that you purchase over and over again.";
		var monthly_sum = 0;
		var rent = 0;
		for( var i=0; i<monthly.length; i++){ monthly_sum += monthly[i].savings; if(monthly[i].desc == "Rent"){ rent=monthly[i].savings;}}
		savings = (monthly_sum-rent)*0.1;
		monthly_savings += savings;
		recs.push(new Rec(title,desc,savings));
	}
}

function renderObjects() //Output generated information to HTML.
{
	$("#header").html("Analysis Report: "+start_date.toDateString().substring(4)+"-"+end_date.toDateString().substring(4));
	var monthly_sum = 0;
	for( var i=0; i<monthly.length; i++){ monthly_sum += monthly[i].total_cost;}
	var weekly_sum = 0;
	for( var i=0; i<weekly.length; i++){ weekly_sum += weekly[i].total_cost;}
	var rarely_sum = 0;
	for( var i=0; i<rarely.length; i++){ rarely_sum += rarely[i].total_cost;}	
	var pie_chart = new CanvasJS.Chart("chartContainer", //Use third party CanvasJS to make pie chart.
	{
		toolTip:{
		   contentFormatter: function ( e ) {
					   return "$"+e.entries[0].dataPoint.y.formatMoney(0);  
		   }  
		 },
		animationEnabled: true,
		animationDuration: 1500,
		colorSet: "metal",
		title:{
			text: "Cost Distribution"
		},
		legend: {
			maxWidth: 600,
			itemWidth: 120
		},
		data: [
		{
			type: "pie",
			showInLegend: false,
			legendText: "{indexLabel}",
			dataPoints: [
				{ y: Math.round(monthly_sum), indexLabel: "Monthly" },
				{ y: Math.round(weekly_sum), indexLabel: "Weekly" },
				{ y: Math.round(rarely_sum), indexLabel: "General"}
			]
		}
		]
	});
	chart = pie_chart; //chart is a global scope var
	pie_chart.render();
	for( var i=0; i<monthly.length; i++)
	{
		$(".monthly_costs ul").append('<li><h3>'+
			monthly[i].desc+'</h3><p>Total Cost: $'+
			monthly[i].total_cost.formatMoney(0)+'</p><p>Average Cost: $'+
			monthly[i].mean_cost.formatMoney(0)+'</p><p>Cost per week: $'+
			monthly[i].pw_cost.formatMoney(0)+'</p></li>');
	}
	for( var i=0; i<weekly.length; i++)
	{
		$(".weekly_costs ul").append('<li><h3>'+
			weekly[i].desc+'</h3><p>Total Cost: $'+
			weekly[i].total_cost.formatMoney(0)+'</p><p>Average Cost: $'+
			weekly[i].mean_cost.formatMoney(0)+'</p><p>Cost per week: $'+
			weekly[i].pw_cost.formatMoney(0)+'</p></li>');
	}
	for( var i=0; i<rarely.length; i++)
	{
		$(".rare_costs ul").append('<li><h3>'+
			rarely[i].desc+'</h3><p>Total Cost: $'+
			rarely[i].total_cost.formatMoney(0)+'</p><p>Average Cost: $'+
			rarely[i].mean_cost.formatMoney(0)+'</p><p>Cost per week: $'+
			rarely[i].pw_cost.formatMoney(0)+'</p></li>');
	}
	for( var i=0; i<recs.length; i++)
	{
		$(".spec_recs").append('<li><h3>'+
		recs[i].title+'</h3><p>'+
		recs[i].desc+'</p><p class="savings">+$'+
		recs[i].savings.formatMoney(2)+'/month</p></li>');
	}
	$(".monthly_savings").html("+$"+monthly_savings.formatMoney(2));
	update_time_saved(); //Make sure that the range and label are initiated properly
}

function animatePie() //Adhoc method to animate a change in the pie chart. 
{
	var rent = 0;
	for(var i=0; i<monthly.length; i++)
	{
		if(monthly[i].desc == "Rent")
		{
			rent = monthly[i].total_cost;
		}
	}
	var steps = 40; //Number of animation steps between value.
	var monthly_sum = 0;
	if( !document.getElementById("include_rent").checked ){ monthly_sum -= rent; }
	for( var i=0; i<monthly.length; i++){ monthly_sum += monthly[i].total_cost;}
	var weekly_sum = 0;
	for( var i=0; i<weekly.length; i++){ weekly_sum += weekly[i].total_cost;}
	var rarely_sum = 0;
	for( var i=0; i<rarely.length; i++){ rarely_sum += rarely[i].total_cost;}
	var mstep = Math.round((monthly_sum-chart.options.data[0].dataPoints[0].y)/steps);
	var wstep = Math.round((weekly_sum-chart.options.data[0].dataPoints[1].y)/steps);
	var rstep = Math.round((rarely_sum-chart.options.data[0].dataPoints[2].y)/steps);
	for(var i=0; i<steps; i++)
	{
		setTimeout(function(){
			chart.options.data[0].dataPoints[0].y = chart.options.data[0].dataPoints[0].y+mstep;
			chart.options.data[0].dataPoints[1].y = chart.options.data[0].dataPoints[1].y+wstep;
			chart.options.data[0].dataPoints[2].y = chart.options.data[0].dataPoints[2].y+rstep;
			chart.render();
		},i*30); //30 milliseconds per frame is 33 frames per second, looks smooth and doesn't take too long.
	}	
}
function processDesc(desc) //The credit statement descriptions aren't always pretty. Format some descriptions, while generalizing others, like multiple gas stations are all generalized to just "Gas".
{
	var rdesc = desc;
	var regexs = ["gas|chevron|shell|mobile|exxon|noco|sunoco","fee|fees","atm","rent|firstservice|resident","paypal","netflix","hulu","spotify","uber"];
	var descs = ["Gas","Misc Fees","ATM","Rent","Paypal","Netflix","Hulu","Spotify","Uber"];
	for( var i=0; i<regexs.length; i++)
	{
		if(eval("/"+regexs[i]+"/gi").test(rdesc))
		{
			rdesc = descs[i];
			return rdesc;
		}
	}
	rdesc = rdesc.replace(/[0-9]/g, "");
	rdesc = rdesc.replace(/online/gi,"");
	rdesc = rdesc.replace(/purchase/gi,"");
	rdesc = $.trim(rdesc);
	if(rdesc.split(" ").length == 1)
	{
		rdesc = rdesc[0].toUpperCase()+rdesc.substring(1,rdesc.length).toLowerCase();
	}
	return rdesc;
}
