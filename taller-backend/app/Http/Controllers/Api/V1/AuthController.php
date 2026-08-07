<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (! Auth::attempt($credentials)) {
            activity('autenticacion')
                ->withProperties(['email' => $credentials['email'], 'ip' => $request->ip()])
                ->log('Intento de inicio de sesión fallido');

            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        $user = Auth::user();
        $token = $user->createToken('taller-token')->plainTextToken;

        activity('autenticacion')
            ->causedBy($user)
            ->withProperties(['ip' => $request->ip()])
            ->log('Inicio de sesión');

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        activity('autenticacion')
            ->causedBy($request->user())
            ->log('Cierre de sesión');

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        if (! Hash::check($data['current_password'], $request->user()->password)) {
            return response()->json(['message' => 'La contraseña actual es incorrecta'], 422);
        }

        $request->user()->update([
            'password' => Hash::make($data['new_password']),
        ]);

        activity('autenticacion')
            ->causedBy($request->user())
            ->log('Cambio de contraseña');

        // Revocar todos los tokens existentes (forzar re-login en todos los dispositivos)
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Contraseña actualizada. Inicia sesión nuevamente.']);
    }
}
