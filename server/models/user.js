const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var userSchema= new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true,
        validate:{
            validator: (value) => {
                validator.isEmail(value);
            },
            message: '{VALUE} is not a valid email'
        }
    },
    password: {
        type: String,
        require: true,
        minlength: 6
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

userSchema.methods.toJSON = function(){
    var user = this;
    var userObject = user.toObject();

    return _.pick(userObject,['_id','email']);
};

userSchema.methods.generateAuthToken = function(){
    var user = this;
    var access = 'auth';
    var token = jwt.sign({_id: user._id.toHexString(),access},'abc1234').toString();

    user.tokens.push({access, token});
    return user.save().then(() => {
        return token;
    });
};

userSchema.statics.findByToken = function(token){
    var user = this;
    var decoded;
    try {
        decoded = jwt.verify(token ,'abc1234');
    } catch(e){
        // return new Promise((resolve,reject) => {
        //     reject();
        // });
        return Promise.reject();
    }
    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access':'auth'
    });
};

userSchema.statics.findByCredentials = function(email, password){
    var User = this;
    User.findOne({email}).then((user) => {
        if(!user){
            return Promise.reject();
        }
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, result) => {
                if(result){
                    resolve(user);
                } else{
                    reject();
                }
            });
        });
    }).catch();
};

userSchema.methods.removeToken = function(token){
    var user = this;
    user.update({
        $pull: {
            tokens: {
                token: token
            }
        }
    });
};

userSchema.pre('save', function(next){
    var user = this;
    if(user.isModified('password')){
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
            });
        });
        next();
    } else {
        next();
    }
});

var User = mongoose.model('User',userSchema);

module.exports = {User};
