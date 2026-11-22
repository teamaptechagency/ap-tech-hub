<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HubInboxController;
use App\Http\Middleware\AdminOnly;
Route::prefix('api/admin/hub-inbox')->middleware(AdminOnly::class)->group(function(){
    Route::get('/',[HubInboxController::class,'index']);
    Route::get('/notifications',[HubInboxController::class,'notifications']);
    Route::post('/sync-mail',[HubInboxController::class,'syncMail'])->middleware('throttle:10,1,wpn-hub-mail-sync:');
    Route::get('/{id}',[HubInboxController::class,'show'])->whereNumber('id');
    Route::get('/{id}/references',[HubInboxController::class,'references'])->whereNumber('id');
    Route::post('/{id}/draft',[HubInboxController::class,'draft'])->whereNumber('id')->middleware('throttle:30,1,wpn-hub-enquiry-draft:');
});
