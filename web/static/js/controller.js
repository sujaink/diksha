(function(angular) {
    'use strict';

    var robotshop = angular.module('robotshop', ['ngRoute'])

    // Share user between controllers
    robotshop.factory('currentUser', function() {
        var data = {
            uniqueid: '',
            user: {},
        };

        return data;
    });

    robotshop.config(['$routeProvider', '$locationProvider', ($routeProvider, $locationProvider) => {
        $routeProvider.when('/', {
            templateUrl: 'splash.html',
            controller: 'shopform'
        }).when('/product/:sku', {
            templateUrl: 'product.html',
            controller: 'productform'
        }).when('/login', {
            templateUrl: 'login.html',
            controller: 'loginform'
        }).when('/cart', {
            templateUrl: 'cart.html',
            controller: 'cartform'
        });

        // needed for URL rewrite hash
        $locationProvider.html5Mode(true);
    }]);

    // clear template fragment cache
    robotshop.run(function($rootScope, $templateCache) {
        $rootScope.$on('$viewContentLoaded', function() {
            console.log('>>> clearing cache');
            $templateCache.removeAll();
        });
    });

    robotshop.controller('shopform', function($scope, $http, currentUser) {
        $scope.data = {};

        $scope.data.uniqueid = 'foo';
        $scope.data.categories = [];
        $scope.data.products = {};

        $scope.getProducts = function(category) {
            if($scope.data.products[category]) {
                $scope.data.products[category] = null;
            } else {
                $http({
                    url: '/api/catalogue/products/' + category,
                    method: 'GET'
                }).then((res) => {
                    $scope.data.products[category] = res.data;
                }).catch((e) => {
                    console.log('ERROR', e);
                });
            }
        };

        function getCategories() {
            $http({
                url: '/api/catalogue/categories',
                method: 'GET'
            }).then((res) => {
                $scope.data.categories = res.data;
                console.log('categories loaded');
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }

        // unique id for cart etc
        function getUniqueid() {
            return new Promise((resolve, reject) => {
            $http({
                url: '/api/user/uniqueid',
                method: 'GET'
            }).then((res) => {
                resolve(res.data.uuid);
            }).catch((e) => {
                console.log('ERROR', e);
                reject(e);
            });
        });
        }

        // init
        console.log('shopform starting...');
        getCategories();
        if(!currentUser.uniqueid) {
            console.log('generating uniqueid');
            getUniqueid().then((id) => {
                $scope.data.uniqueid = id;
                currentUser.uniqueid = id;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }
        
        // watch for login
        $scope.$watch(() => { return currentUser.uniqueid; }, (newVal, oldVal) => {
            if(newVal !== oldVal) {
                $scope.data.uniqueid = currentUser.uniqueid;
            }
        });
    });

    robotshop.controller('productform', function($scope, $http, $routeParams, currentUser) {
        $scope.data = {};
        $scope.data.message = '';
        $scope.data.product = {};
        $scope.data.quantity = 1;

        $scope.addToCart = function() {
            var url = '/api/cart/add/' + currentUser.uniqueid + '/' + $scope.data.product.sku + '/' + $scope.data.quantity;
            console.log('addToCart', url);
            $http({
                url: url,
                method: 'GET'
            }).then((res) => {
                console.log('cart', res);
                $scope.data.message = 'Added to cart';
                setTimeout(clearMessage, 3000);
            }).catch((e) => {
                console.log('ERROR', e);
                $scope.data.message = 'ERROR ' + e;
                setTimeout(clearMessage, 3000);
            });
        };

        function loadProduct(sku) {
            $http({
                url: '/api/catalogue/product/' + sku,
                method: 'GET'
            }).then((res) => {
                $scope.data.product = res.data;
            }).catch((e) => {
                console.log('ERROR', e);
            });
        }

        function clearMessage() {
            $scope.data.message = '';
        }

        loadProduct($routeParams.sku);
    });

    robotshop.controller('cartform', function($scope, $http, currentUser) {
        $scope.data = {};
        $scope.data.uniqueid = currentUser.uniqueid;
    });

    robotshop.controller('loginform', function($scope, $http, currentUser) {
        $scope.data = {};
        $scope.data.name = '';
        $scope.data.email = '';
        $scope.data.password = '';
        $scope.data.password2 = '';
        $scope.data.message = '';
        $scope.data.user = {};

        $scope.login = function() {
            $scope.data.message = '';
            $http({
                url: '/api/user/login',
                method: 'POST',
                data: {
                    name: $scope.data.name,
                    password: $scope.data.password,
                    email: $scope.data.email
                }
            }).then((res) => {
                $scope.data.user = res.data;
                $scope.data.user.password = '';
                $scope.data.password = $scope.data.password2 = '';
                currentUser.user = $scope.data.user;
                currentUser.uniqueid = $scope.data.user.name;
            }).catch((e) => {
                console.log('ERROR', e);
                $scope.data.message = 'ERROR ' + e.data;
                $scope.data.password = '';
            });
        };

        $scope.register = function() {
            $scope.data.message = '';
            $scope.data.name = $scope.data.name.trim();
            $scope.data.email = $scope.data.email.trim();
            $scope.data.password = $scope.data.password.trim();
            $scope.data.password2 = $scope.data.password2.trim();
            // all fields complete
            if($scope.data.name && $scope.data.email && $scope.data.password && $scope.data.password2) {
                if($scope.data.password !== $scope.data.password2) {
                    $scope.data.message = 'Passwords do not match';
                    $scope.data.password = $scope.data.password2 = '';
                    return;
                }
            }
            $http({
                url: '/api/user/register',
                method: 'POST',
                data: {
                    name: $scope.data.name,
                    email: $scope.data.email,
                    password: $scope.data.password
                }
            }).then((res) => {
                $scope.data.user = {
                    name: $scope.data.name,
                    email: $scope.data.email
                };
                $scope.data.password = $scope.data.password2 = '';
                currentUser.user = $scope.data.user;
                currentUser.uniqueid = $scope.data.user.name;
            }).catch((e) => {
                console.log('ERROR', e);
                $scope.data.message = 'ERROR ' + e.data;
                $scope.data.password = $scope.data.password2 = '';
            });
        };

        console.log('loginform init');
        if(!angular.equals(currentUser.user, {})) {
            $scope.data.user = currentUser.user;
        }
    });

}) (window.angular);
