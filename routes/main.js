module.exports = function(app, weatherData) {

    const redirectLogin = (req, res, next) => {
        if (!req.session.userId ) {
          res.redirect('./login')
        } else { next (); }
    } //session logging.
    const { check, validationResult, body } = require('express-validator');

    // Handle our routes
    app.get('/',redirectLogin, function(req,res){
        res.render('index.ejs', weatherData)
    });
    app.get('/about',function(req,res){
        res.render('about.ejs', weatherData);
    });
    app.get('/search',redirectLogin,function(req,res){
        res.render("search.ejs", weatherData);
    });
    app.get('/search-result', function (req, res) {
                req.query.keyword = req.sanitize(req.query.keyword);

                const request = require('request');
                let apiKey = 'afcfc34230c69284bebcee52cc52ea5c';
                let city = req.query.keyword;
                let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`
                     
                request(url, function (err, response, body) {
                if(err){
                    console.log('error:', error);
                } else {
                    // res.send(body);
                    var weather = JSON.parse(body)
                    if (weather!==undefined && weather.main!==undefined) {
                    var wmsg = 'It is '+ weather.main.temp + 
                    ' degrees in '+ weather.name +
                    '! <br> The humidity now is: ' + 
                    weather.main.humidity + ' <br> The timezone for ' + weather.name + ' is : ' + weather.timezone;
                    res.send (wmsg);
                    }
                    else {
                    res.send ("No data found!");
                    }
                    } 
                });
    });
    app.get('/register', function (req,res) {
        res.render('register.ejs', weatherData);                                                                     
    });                                                                                                 
    app.post('/registered',[check('email').isEmail(), check('password').isLength({min:8}).withMessage('Password must be 8+ characters long')], function (req,res) {
        // saving data in database
        req.body.first = req.sanitize(req.body.first);
        req.body.last = req.sanitize(req.body.last);
        req.body.username = req.sanitize(req.body.username);
        const errors = validationResult(req);
        

        if (!errors.isEmpty()) {
            res.redirect('./register');}
        else {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const plainPassword = req.body.password;

            
            bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
                // Store hashed password in your database.
                console.log(hashedPassword);

                let sqlquery = "INSERT INTO logins (first, last, email, username, hashedPassword) VALUES (?,?,?,?,?)";
                // execute sql query
                let newrecord = [req.body.first, req.body.last, req.body.email, req.body.username, hashedPassword];
                db.query(sqlquery, newrecord, (err, result) => {
                    if (err) {
                    return console.error(err.message);
                    }
                    else
                    res.send(' Your details have been added to the database, name: '+ req.body.first + ' ' + req.body.last + ' Your email is: ' + req.body.email + ' Your password is: '+ req.body.password + ' Your hashed password is: ' + hashedPassword + '<br> <a href='+'./'+'>Home</a></br>');
                    });

            })
        }
    }); 
    app.get('/login', function (req,res) {
        res.render('login.ejs', weatherData);                                                                     
    });
    app.post('/loggedin', function (req,res) {
        req.body.username = req.sanitize(req.body.username);
        const bcrypt = require('bcrypt');

        let sqlquery = "SELECT hashedPassword FROM logins WHERE username = ? ";
        let lgdetails = [req.body.username];
        db.query(sqlquery, lgdetails, (err, result) => {
            console.log(result);
            if (err){
                return console.error(err.message);
            }
            else {
                const hashedPassword = result[0].hashedPassword;
                bcrypt.compare(req.body.password, hashedPassword, function(err, result) {
                    // console.log(result);
                    if (err) {
                      // TODO: Handle error
                      return console.error(err.message);
                    }
                    else if (result == true) {
                      // TODO: Send message
                      req.session.userId = req.body.username;
                      res.redirect('./');
                    }
                    else {
                      // TODO: Send message
                      res.send('Incorrect Login!');
                    }
                  }); 
            }
            
        });      
    })

    app.get('/logout', redirectLogin, (req,res) => {
        req.session.destroy(err => {
        if (err) {
          return res.redirect('./')
        }
        res.send('you are now logged out. <a href='+'./'+'>Home</a>');
        })
    })

    app.get('/weather', redirectLogin, (req,res) => {
        const sqlquery = 'SELECT city, country FROM city';
        const request = require('request');
          
        db.query(sqlquery, (err, result) => {
            if (err) {
              console.error(err.message);
              return console.error(err.message);
            }
            if (result.length > 0){ 
                let apiKey = 'afcfc34230c69284bebcee52cc52ea5c';
                Promise.all(result.map(cityData => {
                    let city = cityData.city;
                    let country = cityData.country;
                    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city},${country}&units=metric&appid=${apiKey}`

                    return new Promise((resolve, reject) =>{ // try to understand promises to keep the api to run multiple times to get every city in the database inputed into the screen
                                                             // but it only sends the most recently added city to the screen. Don't have much time to get a solution for it.
                        request(url, function (err, response, body) {
                            if(err){
                              console.log('error:', error);
                            } else {
                              // res.send(body);
                              var weather = JSON.parse(body)
                              if (weather!==undefined && weather.main!==undefined) {
                              var wmsg = 'It is '+ weather.main.temp + 
                              ' degrees in '+ weather.name +
                              '! <br> The humidity now is: ' + 
                              weather.main.humidity +' <br> The timezone for ' + weather.name + ' is : ' + weather.timezone;
                              res.send (wmsg);
                              }
                              else {
                              res.send ("No data found");
                              }
                            } 
                          });
                    });
                }))
            }
            else{
                res.send('no cities found in database');
            }
        
        });
    })

    

    app.get('/list', function(req, res) {
        let sqlquery = "SELECT * FROM city"; // query database to get all the cities
    // execute sql query
    db.query(sqlquery, (err, result) => { 
        if (err) {
        res.redirect('./'); 
    } 
    let newData = Object.assign({}, weatherData, {availableCity:result});
    console.log(newData)
    res.render("list.ejs", newData) 
    });
    });

    app.get('/listeners', function(req, res) {
        let sqlquery = "SELECT * FROM logins"; // query database to get all the logins
    // execute sql query
    db.query(sqlquery, (err, result) => { 
        if (err) {
        res.redirect('./'); 
    } 
    let newData = Object.assign({}, weatherData, {availableLogins:result});
    console.log(newData)
    res.render("listeners.ejs", newData) 
    });
    });

    app.get('/addcountry',function(req,res){ //to get the addbook page
        res.render('addcountry.ejs', weatherData);
    });
    app.post('/countryadded', function (req,res) {
        // saving data in database
        let sqlquery = "INSERT INTO city (city, country) VALUES (?,?)";
        // execute sql query
        let newrecord = [req.body.city, req.body.country];
        db.query(sqlquery, newrecord, (err, result) => {
        if (err) {
        return console.error(err.message);
        }
        else
        res.send(' This book is added to database, City: '+ req.body.city + ' Country: ' + req.body.country);
        });
        });
        
}
