<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GeneralFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GeneralFileController extends Controller
{
    public function index()
    {
        return response()->json(GeneralFile::with('user:id,name')->latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'file'        => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt,csv',
            'description' => 'nullable|string|max:255',
        ]);

        $file         = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension    = $file->getClientOriginalExtension();
        $storedName   = Str::uuid() . '.' . $extension;
        $path         = $file->storeAs('general-files', $storedName, 'public');

        $record = GeneralFile::create([
            'user_id'       => $request->user()->id,
            'original_name' => $originalName,
            'stored_name'   => $storedName,
            'path'          => $path,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
            'description'   => $request->description,
        ]);

        return response()->json($record->load('user:id,name'), 201);
    }

    public function download(GeneralFile $generalFile)
    {
        return Storage::disk('public')->download($generalFile->path, $generalFile->original_name);
    }

    public function destroy(GeneralFile $generalFile)
    {
        Storage::disk('public')->delete($generalFile->path);
        $generalFile->delete();

        return response()->json(['message' => 'Archivo eliminado']);
    }
}
